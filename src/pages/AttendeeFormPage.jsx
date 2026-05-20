import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/api';
import './AttendeeFormPage.css';

export default function AttendeeFormPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [formData, setFormData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [formTouched, setFormTouched] = useState({});

  // Load form data on mount
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/post-acceptance-form-assignments/${assignmentId}/`);
        setAssignment(data);
        setError(null);

        // Load draft data with proper priority:
        // 1. Backend draft (most up-to-date, cross-device)
        // 2. localStorage draft (fallback)
        // 3. Default values
        let draftData = {};

        // Load backend draft first if available
        if (data.draft_data && Object.keys(data.draft_data).length > 0) {
          draftData = data.draft_data;
        } else {
          // Fallback to localStorage if backend draft is empty
          const draftKey = `formDraft_${assignmentId}`;
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft) {
            try {
              draftData = JSON.parse(savedDraft);
            } catch {
              // Invalid JSON, ignore
            }
          }
        }

        // If we have draft data, use it
        if (Object.keys(draftData).length > 0) {
          setFormData(draftData);
        } else {
          // Initialize form data based on event format and user profile
          const eventFormat = data.event_format || data.event?.format;
          const isInPerson = eventFormat === 'in_person';

          const initialData = {};

          // Auto-set attendance mode for in-person events
          if (isInPerson && !formData.attendance_mode) {
            initialData.attendance_mode = 'in_person';
          }

          // Prefill speaker module fields if they exist in the form template
          if (data.form_template?.question_schema?.sections) {
            const schema = data.form_template.question_schema;
            const sectionIds = schema.sections.map(s => s.id);

            // Check if this is a promotional profile form with speaker module
            if (data.form_type === 'promotional_profile' && data.active_modules?.includes('speaker')) {
              // Prefill from user profile if available
              if (data.user_profile) {
                const profile = data.user_profile;

                // Prefill display_name from user profile if available
                if (!initialData.display_name && profile.display_name) {
                  initialData.display_name = profile.display_name;
                } else if (!initialData.display_name && profile.full_name) {
                  initialData.display_name = profile.full_name;
                }

                // Prefill programme_title from profile
                if (!initialData.programme_title && profile.title) {
                  initialData.programme_title = profile.title;
                }

                // Prefill programme_affiliation from profile
                if (!initialData.programme_affiliation && profile.organization) {
                  initialData.programme_affiliation = profile.organization;
                } else if (!initialData.programme_affiliation && profile.company) {
                  initialData.programme_affiliation = profile.company;
                }

                // Prefill LinkedIn from profile
                if (!initialData.linkedin_url && profile.linkedin_url) {
                  initialData.linkedin_url = profile.linkedin_url;
                }
              }
            }
          }

          if (Object.keys(initialData).length > 0) {
            setFormData(initialData);
          }
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftKey = `formDraft_${assignmentId}`;
    if (Object.keys(formData).length > 0) {
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }
  }, [formData, assignmentId]);

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    setFormTouched(prev => ({
      ...prev,
      [fieldId]: true
    }));
    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const isFieldVisible = (field) => {
    // Check showIfValue condition
    if (field.showIfValue) {
      const { field: conditionField, value: conditionValue } = field.showIfValue;
      if (formData[conditionField] !== conditionValue) {
        return false;
      }
    }

    // Check showIfIncludes condition (for multi_select fields and promotional modules)
    if (field.showIfIncludes) {
      const { field: conditionField, value: conditionValue } = field.showIfIncludes;

      // Special case: active_modules check
      if (conditionField === 'active_modules') {
        if (!assignment.active_modules?.includes(conditionValue)) {
          return false;
        }
      } else {
        // Standard form field check
        const fieldValue = formData[conditionField];
        if (!Array.isArray(fieldValue) || !fieldValue.includes(conditionValue)) {
          return false;
        }
      }
    }

    // Check showIfInList condition
    if (field.showIfInList) {
      const { field: conditionField, values: conditionValues } = field.showIfInList;
      if (!conditionValues.includes(formData[conditionField])) {
        return false;
      }
    }

    return true;
  };

  const validateForm = (fullValidation = true) => {
    const errors = {};
    const schema = assignment?.form_template?.question_schema;
    const eventFormat = assignment?.event?.format || assignment?.event_format;

    // Event format helpers
    const isOnline = eventFormat === 'virtual' || eventFormat === 'online';
    const isInPerson = eventFormat === 'in_person';
    const isHybrid = eventFormat === 'hybrid';

    // For in-person, attendance_mode is not needed and auto-set to 'in_person'
    // For hybrid, attendance_mode is user-selected
    const attendanceMode = formData.attendance_mode || (isInPerson ? 'in_person' : null);

    // Physical sections visible if: in-person OR (hybrid AND user selected in-person)
    const showPhysicalSections = isInPerson || (isHybrid && attendanceMode === 'in_person');

    if (!schema?.sections) return errors;

    for (const section of schema.sections) {
      // Skip validation for sections that shouldn't be shown
      if (!isSectionVisible(section)) continue;
      if (section.showOnlyForHybrid && !isHybrid) continue;
      if (section.showOnlyForPhysical && !showPhysicalSections) continue;

      for (const field of section.fields || []) {
        // Skip validation for fields that shouldn't be shown
        if (field.showOnlyForHybrid && !isHybrid) continue;
        if (!isFieldVisible(field)) continue;

        // For in-person events, don't require attendance_mode field
        if (field.id === 'attendance_mode' && isInPerson) continue;

        // Only validate required fields in full validation
        if (fullValidation && field.required) {
          const value = formData[field.id];
          if (field.type === 'multi_select') {
            if (!value || (Array.isArray(value) && value.length === 0)) {
              errors[field.id] = 'This field is required';
            }
          } else if (field.type === 'file_upload') {
            if (!value) {
              errors[field.id] = 'This field is required';
            }
          } else {
            if (!value || value === '') {
              errors[field.id] = 'This field is required';
            }
          }
        }

        // Validate single file uploads (both required and optional if provided)
        if (field.type === 'file_upload') {
          const value = formData[field.id];
          if (value instanceof File) {
            const file = value;

            // Get file size limits based on field
            let maxSizeMB = 10; // default
            if (field.id === 'slide_deck') {
              maxSizeMB = 50;
            } else if (field.id === 'headshot') {
              maxSizeMB = 10;
            }

            // Check file size
            const maxBytes = maxSizeMB * 1024 * 1024;
            if (file.size > maxBytes) {
              errors[field.id] = `File too large (max ${maxSizeMB}MB). Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`;
            }

            // Check file type
            const acceptTypes = (field.accept || '').split(',').map(t => t.trim());
            if (acceptTypes.length > 0 && acceptTypes[0] !== '') {
              // Convert MIME types to extensions for display
              let typeError = false;
              const fileType = file.type;

              if (field.id === 'headshot') {
                if (!['image/jpeg', 'image/png'].includes(fileType)) {
                  errors[field.id] = 'Headshot must be JPG or PNG format';
                  typeError = true;
                }
              } else if (field.id === 'slide_deck') {
                if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(fileType)) {
                  errors[field.id] = 'Slide deck must be PDF or PPTX format';
                  typeError = true;
                }
              }

              if (typeError && !errors[field.id]) {
                // Generic type error if not caught above
                errors[field.id] = `File type not allowed. Expected: ${acceptTypes.join(', ')}`;
              }
            }
          }
        }

        // Validate multiple file uploads
        if (field.type === 'file_upload_multiple') {
          const value = formData[field.id];
          const fileList = Array.isArray(value) ? value : (value ? [value] : []);

          if (fileList.length > 0) {
            let maxSizeMB = field.maxSize || 10;

            fileList.forEach((file, index) => {
              if (file instanceof File) {
                // Check file size
                const maxBytes = maxSizeMB * 1024 * 1024;
                if (file.size > maxBytes) {
                  if (!errors[field.id]) {
                    errors[field.id] = `File ${index + 1} (${file.name}) is too large (max ${maxSizeMB}MB)`;
                  }
                }
              }
            });

            // Check max file count if specified
            const maxFiles = field.maxFiles || 5;
            if (fileList.length > maxFiles) {
              errors[field.id] = `Maximum ${maxFiles} files allowed, you have ${fileList.length}`;
            }
          }
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      const schema = assignment?.form_template?.question_schema;
      const eventFormat = assignment?.event?.format || assignment?.event_format;

      // Event format helpers
      const isInPerson = eventFormat === 'in_person';
      const isHybrid = eventFormat === 'hybrid';
      const attendanceMode = formData.attendance_mode || (isInPerson ? 'in_person' : null);
      const showPhysicalSections = isInPerson || (isHybrid && attendanceMode === 'in_person');

      // Filter to only visible fields (exclude empty strings and undefined)
      const visibleData = {};
      if (schema?.sections) {
        for (const section of schema.sections) {
          if (!isSectionVisible(section)) continue;
          if (section.showOnlyForHybrid && !isHybrid) continue;
          if (section.showOnlyForPhysical && !showPhysicalSections) continue;

          for (const field of section.fields || []) {
            if (field.showOnlyForHybrid && !isHybrid) continue;
            if (!isFieldVisible(field)) continue;

            const value = formData[field.id];
            // Include non-empty values and non-empty arrays
            if (value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)) {
              visibleData[field.id] = value;
            }
          }
        }
      }

      await apiClient.post(`/post-acceptance-form-assignments/${assignmentId}/save-draft/`, {
        answers: visibleData
      });

      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (err) {
      setError('Failed to save draft: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm(true)) {
      // Scroll to first error
      const firstErrorElement = document.querySelector('[data-error-field]');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setSubmitting(true);

      // Filter to only visible fields
      const schema = assignment?.form_template?.question_schema;
      const eventFormat = assignment?.event?.format || assignment?.event_format;

      // Event format helpers
      const isInPerson = eventFormat === 'in_person';
      const isHybrid = eventFormat === 'hybrid';
      const attendanceMode = formData.attendance_mode || (isInPerson ? 'in_person' : null);
      const showPhysicalSections = isInPerson || (isHybrid && attendanceMode === 'in_person');

      const visibleData = {};
      let hasFiles = false;
      if (schema?.sections) {
        for (const section of schema.sections) {
          if (!isSectionVisible(section)) continue;
          if (section.showOnlyForHybrid && !isHybrid) continue;
          if (section.showOnlyForPhysical && !showPhysicalSections) continue;

          for (const field of section.fields || []) {
            if (field.showOnlyForHybrid && !isHybrid) continue;
            if (!isFieldVisible(field)) continue;

            const value = formData[field.id];
            // Include non-empty values and non-empty arrays
            if (value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)) {
              if (value instanceof File) {
                hasFiles = true;
              } else if (Array.isArray(value) && value.some(item => item instanceof File)) {
                hasFiles = true;
              }
              visibleData[field.id] = value;
            }
          }
        }
      }

      // Use FormData if there are files, otherwise use JSON
      if (hasFiles) {
        const formDataObj = new FormData();

        // Append all answers data
        for (const [key, value] of Object.entries(visibleData)) {
          if (value instanceof File) {
            // Single file
            formDataObj.append(`answers.${key}`, value);
          } else if (Array.isArray(value)) {
            // Check if array contains files or is a multi-select array
            const hasFileInArray = value.some(item => item instanceof File);
            if (hasFileInArray) {
              // Append each file separately
              value.forEach((item, idx) => {
                if (item instanceof File) {
                  formDataObj.append(`answers.${key}`, item);
                }
              });
            } else {
              // Multi-select values - JSON stringify the array
              formDataObj.append(`answers.${key}`, JSON.stringify(value));
            }
          } else {
            formDataObj.append(`answers.${key}`, value);
          }
        }

        await apiClient.post(`/post-acceptance-form-assignments/${assignmentId}/submit/`, formDataObj);
      } else {
        await apiClient.post(`/post-acceptance-form-assignments/${assignmentId}/submit/`, {
          answers: visibleData
        });
      }

      // Clear draft from localStorage
      localStorage.removeItem(`formDraft_${assignmentId}`);

      alert('Form submitted successfully!');
      navigate('/account/events');
    } catch (err) {
      // Handle field-level validation errors from backend
      if (err.response?.data?.errors && typeof err.response.data.errors === 'object') {
        setValidationErrors(err.response.data.errors);
        setError('Please fix the errors below');
      } else {
        setError(err.response?.data?.detail || 'Failed to submit form');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="form-page loading">Loading form...</div>;
  }

  if (error) {
    return <div className="form-page error">{error}</div>;
  }

  if (!assignment) {
    return <div className="form-page error">Form not found</div>;
  }

  const schema = assignment.form_template?.question_schema || {};
  const sections = schema.sections || [];

  // Determine event format and conditional visibility
  const eventFormat = assignment.event?.format || assignment.event_format;

  // Event format helpers
  const isOnline = eventFormat === 'virtual' || eventFormat === 'online';
  const isInPerson = eventFormat === 'in_person';
  const isHybrid = eventFormat === 'hybrid';
  const attendanceMode = formData.attendance_mode || (isInPerson ? 'in_person' : null);

  // Show physical sections if in-person OR (hybrid AND user selected in-person)
  const showPhysicalSections = isInPerson || (isHybrid && attendanceMode === 'in_person');

  // Check if section should be visible based on showIfIncludes condition
  const isSectionVisible = (section) => {
    if (section.showIfIncludes) {
      const { field, value } = section.showIfIncludes;

      if (field === 'active_modules') {
        return assignment.active_modules?.includes(value);
      }

      const fieldValue = formData[field];
      return Array.isArray(fieldValue) && fieldValue.includes(value);
    }

    return true;
  };


  return (
    <div className="form-page">
      <div className="form-container">
        <div className="form-header">
          <h1>{assignment.form_template?.title || 'Form'}</h1>
          <p className="event-name">{assignment.event_title}</p>
          {assignment.deadline && (
            <p className="deadline">Due: {new Date(assignment.deadline).toLocaleDateString()}</p>
          )}
          <p className="event-format" style={{ fontSize: '12px', color: '#666' }}>
            Format: {isInPerson ? 'In-Person' : isHybrid ? 'Hybrid (Select Attendance)' : 'Online'}
          </p>
        </div>

        {assignment.form_template?.description && (
          <p className="form-description">{assignment.form_template.description}</p>
        )}

        {/* Privacy Notice - Different messages for participant info vs promotional profile */}
        {assignment.form_type === 'participant_information' && (
          <div className="privacy-notice">
            <div className="privacy-notice-icon">🔒</div>
            <div className="privacy-notice-content">
              <h3>Data Privacy Notice</h3>
              <p>
                The following information is <strong>restricted to authorized event staff only</strong> and will not be shared publicly:
              </p>
              <ul>
                <li><strong>Emergency Contact Details</strong> (name, phone, relationship)</li>
                <li><strong>Medical & Accessibility Information</strong> (accessibility needs, medical details, mobility requirements)</li>
                <li><strong>Dietary Information</strong> (allergies, restrictions, preferences)</li>
              </ul>
              <p>
                All restricted data will be automatically deleted <strong>30 days after the event ends</strong>.
                Your attendance and general information will remain visible to organizers.
              </p>
            </div>
          </div>
        )}

        {/* Privacy Notice for Promotional Profile */}
        {assignment.form_type === 'promotional_profile' && (
          <div className="privacy-notice promotional-privacy">
            <div className="privacy-notice-icon">🌐</div>
            <div className="privacy-notice-content">
              <h3>Public Profile Notice</h3>
              <p>
                The information you provide will be published on the event website and may be used in promotional materials:
              </p>
              <ul>
                <li><strong>Profile Information</strong> (name, bio, headshot, titles)</li>
                <li><strong>Company/Organization Details</strong> (logos, descriptions, links)</li>
                <li><strong>Professional Information</strong> (social media, website)</li>
              </ul>
              <p>
                You control visibility through the <strong>display consent</strong> setting. You can withdraw consent at any time.
              </p>
            </div>
          </div>
        )}

        {draftSaved && <div className="draft-saved-message">✓ Draft saved successfully</div>}

        <form onSubmit={handleSubmit}>
          {sections.map((section, sectionIndex) => {
            // Skip section if not visible based on showIfIncludes condition
            if (!isSectionVisible(section)) {
              return null;
            }

            // Skip section if it should only show for hybrid but isn't hybrid
            if (section.showOnlyForHybrid && !isHybrid) {
              return null;
            }

            // Skip physical sections if user selected online or event is not in-person/hybrid
            if (section.showOnlyForPhysical && !showPhysicalSections) {
              return null;
            }

            const isRestrictedSection = ['emergency_contact', 'food_requirements'].includes(section.id);
            const isAccessibilitySection = section.id === 'accessibility';

            return (
              <div key={sectionIndex} className="form-section">
                <h2 className="section-title">{section.title}</h2>

                {/* Restricted data notice for relevant sections */}
                {isRestrictedSection && (
                  <div className="restricted-notice">
                    🔒 Restricted data: Visible only to authorized event staff and deleted 30 days after the event
                  </div>
                )}

                {isAccessibilitySection && (
                  <div className="restricted-notice">
                    🔒 Your accessibility and medical information is restricted to authorized event staff only
                  </div>
                )}

                {section.description && (
                  <p className="section-description">{section.description}</p>
                )}

                {/* Food Requirements Grid */}
                {section.id === 'food_requirements' && (
                  <div className="food-requirements-grid">
                    {section.fields?.map((field) => {
                      if (!isFieldVisible(field)) return null;
                      if (['food_allergies', 'dietary_restrictions'].includes(field.id)) {
                        return (
                          <div key={field.id} className="food-field-group">
                            <FormField
                              field={field}
                              value={formData[field.id] || []}
                              onChange={(value) => handleFieldChange(field.id, value)}
                              error={validationErrors[field.id]}
                              allFormData={formData}
                              touched={formTouched[field.id]}
                            />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {/* Regular fields */}
                {section.fields?.map((field) => {
                  if (!isFieldVisible(field)) {
                    return null;
                  }

                  // Skip food multi-selects as they're handled in grid above
                  if (section.id === 'food_requirements' && ['food_allergies', 'dietary_restrictions'].includes(field.id)) {
                    return null;
                  }

                  // Skip fields that should only show for hybrid
                  if (field.showOnlyForHybrid && !isHybrid) {
                    return null;
                  }

                  return (
                    <div
                      key={field.id}
                      className="form-field"
                      data-error-field={validationErrors[field.id] ? field.id : undefined}
                    >
                      <FormField
                        field={field}
                        value={formData[field.id] || (field.type === 'multi_select' ? [] : '')}
                        onChange={(value) => handleFieldChange(field.id, value)}
                        error={validationErrors[field.id]}
                        allFormData={formData}
                        touched={formTouched[field.id]}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || submitting}
              className="btn btn-secondary"
            >
              {savingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>
            <button
              type="submit"
              disabled={submitting || savingDraft}
              className="btn btn-primary"
            >
              {submitting ? 'Submitting...' : 'Submit Form'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/account/events')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ field, value, onChange, error, allFormData, touched }) {
  const isRequired = field.required ? ' *' : '';

  switch (field.type) {
    case 'text':
      return (
        <div className="field-wrapper">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          <input
            id={field.id}
            type="text"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'input-error' : ''}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'url':
      return (
        <div className="field-wrapper">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          <input
            id={field.id}
            type="url"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'input-error' : ''}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'email':
      return (
        <div className="field-wrapper">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          <input
            id={field.id}
            type="email"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'input-error' : ''}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'textarea':
      return (
        <div className="field-wrapper">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          <textarea
            id={field.id}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'input-error' : ''}
            rows="4"
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'email':
      return (
        <div className="field-wrapper">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          <input
            id={field.id}
            type="email"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'input-error' : ''}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'tel':
      return (
        <div className="field-wrapper">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          <input
            id={field.id}
            type="tel"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => {
              const numericOnly = e.target.value.replace(/\D/g, '');
              onChange(numericOnly);
            }}
            className={error ? 'input-error' : ''}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <div className="field-wrapper">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          <input
            id={field.id}
            type="number"
            min={field.min}
            max={field.max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'input-error' : ''}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div className="field-wrapper">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          <input
            id={field.id}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'input-error' : ''}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'select':
      return (
        <div className="field-wrapper">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          <select
            id={field.id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'input-error' : ''}
          >
            <option value="">-- Select --</option>
            {field.options?.map((option) => {
              // Support both string[] and {value, label}[] formats
              const optionValue = typeof option === 'string' ? option : option.value;
              const optionLabel = typeof option === 'string' ? option : option.label;
              return (
                <option key={optionValue} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}
          </select>
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="field-wrapper checkbox-field">
          <label className="checkbox-label">
            <input
              id={field.id}
              type="checkbox"
              checked={value === 'true' || value === true}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            />
            <span>{field.label}{isRequired}</span>
          </label>
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'multi_select':
      return (
        <div className="field-wrapper">
          <label>{field.label}{isRequired}</label>
          <div className="multi-select-options">
            {field.options?.map((option) => {
              // Support both string[] and {value, label}[] formats
              const optionValue = typeof option === 'string' ? option : option.value;
              const optionLabel = typeof option === 'string' ? option : option.label;
              return (
                <label key={optionValue} className="multi-select-item">
                  <input
                    type="checkbox"
                    value={optionValue}
                    checked={Array.isArray(value) && value.includes(optionValue)}
                    onChange={(e) => {
                      const newValue = Array.isArray(value) ? [...value] : [];
                      if (e.target.checked) {
                        // If checking "none", clear all other options
                        if (optionValue === 'none') {
                          onChange(['none']);
                        } else {
                          // If checking any other option, remove "none"
                          const filtered = newValue.filter(v => v !== 'none');
                          if (!filtered.includes(optionValue)) {
                            onChange([...filtered, optionValue]);
                          }
                        }
                      } else {
                        // If unchecking, just remove from array
                        onChange(newValue.filter(v => v !== optionValue));
                      }
                    }}
                  />
                  <span>{optionLabel}</span>
                </label>
              );
            })}
          </div>
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'file_upload':
      const fileName = value instanceof File ? value.name : (typeof value === 'string' ? value : '');
      const acceptTypes = field.accept || '*/*';
      const maxSizeMB = field.maxSize || (field.id === 'headshot' ? 10 : field.id === 'slide_deck' ? 50 : 10);

      return (
        <div className="field-wrapper file-upload-field">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          {field.help_text && (
            <p className="field-help-text">{field.help_text}</p>
          )}
          <div className="file-upload-container">
            <input
              id={field.id}
              type="file"
              accept={acceptTypes}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Check file size
                  const maxBytes = maxSizeMB * 1024 * 1024;
                  if (file.size > maxBytes) {
                    onChange(null);
                    return;
                  }
                  onChange(file);
                }
              }}
              className={error ? 'input-error' : ''}
              style={{ display: 'none' }}
            />
            <div className="file-upload-area">
              <label htmlFor={field.id} className="file-upload-label">
                <div className="file-upload-icon">📎</div>
                <div className="file-upload-text">
                  {fileName ? (
                    <>
                      <p className="file-name">{fileName}</p>
                      <p className="file-action">Click to change or drag a new file</p>
                    </>
                  ) : (
                    <>
                      <p className="file-action">Click to select or drag file here</p>
                      <p className="file-hint">Max {maxSizeMB}MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>
            {fileName && (
              <button
                type="button"
                className="file-remove-btn"
                onClick={() => onChange(null)}
                title="Remove file"
              >
                ✕
              </button>
            )}
          </div>
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'file_upload_multiple':
      const fileList = Array.isArray(value) ? value : (value ? [value] : []);
      const acceptTypesMulti = field.accept || '*/*';
      const maxSizeMulti = field.maxSize || 10;
      const maxFilesCount = field.maxFiles || 5;

      return (
        <div className="field-wrapper file-upload-multiple-field">
          <label htmlFor={field.id}>
            {field.label}{isRequired}
          </label>
          {field.help_text && (
            <p className="field-help-text">{field.help_text}</p>
          )}
          <div className="file-upload-multiple-container">
            <input
              id={field.id}
              type="file"
              accept={acceptTypesMulti}
              multiple
              disabled={fileList.length >= maxFilesCount}
              onChange={(e) => {
                const newFiles = Array.from(e.target.files || []);
                // Filter valid files
                const validFiles = newFiles.filter(file => {
                  const maxBytes = maxSizeMulti * 1024 * 1024;
                  return file.size <= maxBytes;
                });
                if (fileList.length + validFiles.length > maxFilesCount) {
                  // Limit to maxFilesCount
                  onChange([...fileList, ...validFiles].slice(0, maxFilesCount));
                } else {
                  onChange([...fileList, ...validFiles]);
                }
              }}
              className={error ? 'input-error' : ''}
              style={{ display: 'none' }}
            />
            <div className="file-upload-multiple-area">
              <label htmlFor={field.id} className="file-upload-multiple-label">
                <div className="file-upload-icon">📁</div>
                <div className="file-upload-text">
                  <p className="file-action">Click to select or drag files here</p>
                  <p className="file-hint">
                    Up to {maxFilesCount} files, max {maxSizeMulti}MB each
                    {fileList.length > 0 && ` (${fileList.length}/${maxFilesCount} uploaded)`}
                  </p>
                </div>
              </label>
            </div>
            {fileList.length > 0 && (
              <div className="file-list">
                <div className="file-list-header">Uploaded Files ({fileList.length})</div>
                {fileList.map((file, index) => (
                  <div key={index} className="file-list-item">
                    <span className="file-list-name">
                      {file instanceof File ? file.name : file}
                    </span>
                    <button
                      type="button"
                      className="file-list-remove-btn"
                      onClick={() => {
                        const newFiles = fileList.filter((_, i) => i !== index);
                        onChange(newFiles.length > 0 ? newFiles : null);
                      }}
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    default:
      return null;
  }
}
