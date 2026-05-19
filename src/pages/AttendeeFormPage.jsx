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
          // Initialize form data based on event format
          // For in-person: auto-set attendance_mode to 'in_person'
          // For hybrid: leave attendance_mode empty (user must select)
          // For online: no attendance_mode needed
          const eventFormat = data.event_format || data.event?.format;
          const isInPerson = eventFormat === 'in_person';

          const initialData = {};
          if (isInPerson && !formData.attendance_mode) {
            initialData.attendance_mode = 'in_person';
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

    // Check showIfIncludes condition (for multi_select fields)
    if (field.showIfIncludes) {
      const { field: conditionField, value: conditionValue } = field.showIfIncludes;
      const fieldValue = formData[conditionField];
      if (!Array.isArray(fieldValue) || !fieldValue.includes(conditionValue)) {
        return false;
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
          } else {
            if (!value || value === '') {
              errors[field.id] = 'This field is required';
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
      if (schema?.sections) {
        for (const section of schema.sections) {
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

      await apiClient.post(`/post-acceptance-form-assignments/${assignmentId}/submit/`, {
        answers: visibleData
      });

      // Clear draft from localStorage
      localStorage.removeItem(`formDraft_${assignmentId}`);

      alert('Form submitted successfully!');
      navigate('/my-events');
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

        {/* Privacy Notice */}
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

        {draftSaved && <div className="draft-saved-message">✓ Draft saved successfully</div>}

        <form onSubmit={handleSubmit}>
          {sections.map((section, sectionIndex) => {
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
              onClick={() => navigate('/my-events')}
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
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
            {field.options?.map((option) => (
              <label key={option.value} className="multi-select-item">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const newValue = Array.isArray(value) ? [...value] : [];
                    if (e.target.checked) {
                      // If checking "none", clear all other options
                      if (option.value === 'none') {
                        onChange(['none']);
                      } else {
                        // If checking any other option, remove "none"
                        const filtered = newValue.filter(v => v !== 'none');
                        if (!filtered.includes(option.value)) {
                          onChange([...filtered, option.value]);
                        }
                      }
                    } else {
                      // If unchecking, just remove from array
                      onChange(newValue.filter(v => v !== option.value));
                    }
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    default:
      return null;
  }
}
