import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Paper,
  Stack,
  Button,
  useMediaQuery,
  useTheme,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import {
  Coffee, Clock, MapPin, Search, Send, Check, X, CheckCircle,
  Building2, ArrowRight, Users, Bell, MessageSquare,
  ArrowLeft, Calendar, Settings, Mail, AlertCircle, Timer
} from 'lucide-react';
import MyMeetingsView from '../components/MyMeetingsView';
import ScheduleTab from '../components/ScheduleTab';
import { toast } from 'react-toastify';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

const COLORS = {
  primary: '#E8532F',
  dark: '#1B2A4A',
  teal: '#0A9396',
  purple: '#7B2D8E',
  gold: '#D4920B',
  bg: '#F7F5F2',
};

const ROLE_CHIP_COLORS = {
  speaker: { backgroundColor: COLORS.gold + '22', color: COLORS.gold },
  host: { backgroundColor: COLORS.teal + '22', color: COLORS.teal },
  moderator: { backgroundColor: COLORS.purple + '22', color: COLORS.purple },
  attendee: { backgroundColor: '#f5f5f5', color: '#424242' },
};

// Flow step indicator
function FlowStep({ step, current, label }) {
  const done = step < current;
  const active = step === current;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, opacity: active ? 1 : done ? 0.7 : 0.35 }}>
      <Box sx={{
        width: 24, height: 24, borderRadius: '50%',
        background: done ? COLORS.teal : active ? COLORS.primary : '#DDD',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: '#fff', transition: 'all 0.3s',
      }}>
        {done ? <Check size={12} strokeWidth={3} color="#fff" /> : step}
      </Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: active ? 680 : 480, color: active ? COLORS.dark : '#999' }}>
        {label}
      </Typography>
    </Box>
  );
}

function DesktopView({
  event,
  allParticipants,
  loading,
  error,
  userInitials,
  searchQuery,
  onSearchChange,
  networkingSettings,
  currentUserId,
  flowStep,
  setFlowStep,
  selectedAttendee,
  setSelectedAttendee,
  selectedDuration,
  setSelectedDuration,
  selectedSlot,
  setSelectedSlot,
  availableSlots,
  slotsLoading,
  meetingNote,
  setMeetingNote,
  submitting,
  handleSendRequest,
  myMeetings,
  onHoveredAttendee,
  hoveredAttendee,
}) {
  const durations = [
    { mins: 5, label: '5 min', desc: 'Quick intro' },
    { mins: 10, label: '10 min', desc: 'Focused chat' },
    { mins: 15, label: '15 min', desc: 'Deep discussion' },
  ];

  return (
    <Box sx={{
      background: '#fff', borderRadius: 2, overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(27,42,74,0.08)',
    }}>
      {/* Header */}
      <Box sx={{
        p: '14px 24px', background: '#fff',
        borderBottom: '1px solid #F0EEEB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontWeight: 850, fontSize: 20, color: COLORS.dark, letterSpacing: -0.5 }}>imaa</Typography>
          <Box sx={{ height: 20, width: 1, background: '#E8E4DF' }} />
          <Typography sx={{ fontSize: 13, color: '#999', fontWeight: 500 }}>
            {event?.title || 'Annual M&A Conference 2026'}
          </Typography>
        </Box>
        <Box sx={{
          width: 34, height: 34, borderRadius: 1.125,
          background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
        }}>{userInitials || 'CK'}</Box>
      </Box>

      <Box sx={{ p: '20px 24px', minHeight: 480 }}>
        {/* Flow progress */}
        {flowStep > 0 && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 1, p: '14px 16px', mb: 3,
            borderRadius: 1.25, background: COLORS.bg,
          }}>
            {['Browse', 'Pick Time', 'Awaiting', 'Confirmed'].map((l, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <FlowStep step={i + 1} current={flowStep} label={l} />
                {i < 3 && (
                  <Box sx={{
                    flex: 1, height: 1.5, background: i + 1 < flowStep ? COLORS.teal : '#E0DCD7',
                    borderRadius: 1, transition: 'all 0.3s',
                  }} />
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* STEP 1: Browse */}
        {flowStep === 1 && (
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 740, color: COLORS.dark, mb: 0.5 }}>
              Conference Attendees
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#999', mb: 2 }}>
              {allParticipants.length} attendees · Tap ☕ to request a 1:1 at the networking tables
            </Typography>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1, p: '10px 14px',
              borderRadius: 1.25, background: COLORS.bg, mb: 2,
            }}>
              <Search size={15} color="#BBB" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search by name, company, or role…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  flex: 1, fontSize: 13, color: '#CCC', background: 'transparent',
                  border: 'none', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </Box>

            {loading && <CircularProgress sx={{ mx: 'auto', display: 'block', my: 4 }} size={32} />}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {!loading && allParticipants.length === 0 && !error && (
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: COLORS.bg }}>
                <Typography>No participants found.</Typography>
              </Paper>
            )}

            {!loading && allParticipants.length > 0 && (
              <Stack spacing={0.5}>
                {allParticipants.map((p, i) => (
                  <Box
                    key={`${p.registration_id || 'v'}-${p.user_id || p.display_name}`}
                    onMouseEnter={() => onHoveredAttendee(i)}
                    onMouseLeave={() => onHoveredAttendee(null)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      p: '14px 16px', borderRadius: 1.5, transition: 'all 0.15s',
                      background: hoveredAttendee === i ? COLORS.bg : 'transparent',
                      border: '1px solid ' + (hoveredAttendee === i ? '#E8E4DF' : 'transparent'),
                    }}
                  >
                    <Avatar
                      src={p.avatar_url}
                      sx={{
                        width: 48, height: 48, borderRadius: 1.5,
                        background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                        fontWeight: 700, fontSize: 15, color: '#fff',
                      }}
                    >
                      {p.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 640, color: COLORS.dark }}>
                          {p.display_name}
                        </Typography>
                        {p.badge_key && p.badge_key !== 'attendee' && (
                          <Chip
                            label={p.badge_label}
                            size="small"
                            sx={{
                              height: 18, fontSize: '0.65rem', fontWeight: 750,
                              backgroundColor: ROLE_CHIP_COLORS[p.badge_key]?.backgroundColor,
                              color: ROLE_CHIP_COLORS[p.badge_key]?.color,
                            }}
                          />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 13, color: '#888', mt: 0.25 }}>
                        {p.job_title || 'Role not specified'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.125, fontSize: 12, color: '#BBB' }}>
                        <Building2 size={11} strokeWidth={2} />
                        {p.company || 'Company not specified'}
                      </Box>
                    </Box>
                    <Button
                      onClick={() => {
                        setFlowStep(2);
                        setSelectedAttendee(p);
                        setSelectedDuration(1);
                        setSelectedSlot(null);
                      }}
                      disabled={!networkingSettings?.enabled || currentUserId === p.user_id}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, p: '10px 18px',
                        borderRadius: 1.25, border: `1.5px solid ${COLORS.teal}30`, background: COLORS.teal + '06',
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 640, color: COLORS.teal,
                        opacity: hoveredAttendee === i ? 1 : 0, transition: 'opacity 0.15s',
                        textTransform: 'none',
                        '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                      }}
                    >
                      <Coffee size={15} strokeWidth={2} /> Request 1:1
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* STEP 2: Pick Time */}
        {flowStep === 2 && selectedAttendee && (
          <Box>
            <Button
              onClick={() => setFlowStep(1)}
              sx={{
                background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 0.5, fontSize: 12, color: '#999', fontFamily: 'inherit',
                mb: 1.5, fontWeight: 550, textTransform: 'none', p: 0,
              }}
            >
              <ArrowLeft size={14} /> Back to attendees
            </Button>
            <Typography sx={{ fontSize: 18, fontWeight: 740, color: COLORS.dark, mb: 0.5 }}>
              Request a 1:1 Meeting
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 2.5, mt: 2 }}>
              <Box>
                {/* With whom */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: '14px 16px',
                  borderRadius: 1.5, background: COLORS.bg, mb: 2,
                }}>
                  <Avatar
                    src={selectedAttendee.avatar_url}
                    sx={{
                      width: 44, height: 44, borderRadius: 1.375,
                      background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                      fontWeight: 700, fontSize: 14, color: '#fff',
                    }}
                  >
                    {selectedAttendee.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 640, color: COLORS.dark }}>
                      {selectedAttendee.display_name}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#999' }}>
                      {selectedAttendee.job_title} · {selectedAttendee.company}
                    </Typography>
                  </Box>
                </Box>

                {/* Duration picker */}
                <Typography sx={{
                  fontSize: 10, fontWeight: 750, textTransform: 'uppercase',
                  letterSpacing: 1, color: COLORS.dark + '40', mb: 1,
                }}>How Long?</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {[
                    { mins: 5, label: '5 min', desc: 'Quick intro' },
                    { mins: 10, label: '10 min', desc: 'Focused chat' },
                    { mins: 15, label: '15 min', desc: 'Deep discussion' },
                  ].map((d, i) => (
                    <Button
                      key={i}
                      onClick={() => setSelectedDuration(i)}
                      sx={{
                        flex: 1, p: '10px 12px', borderRadius: 1.25, border: 'none',
                        background: selectedDuration === i ? COLORS.dark : '#F0EEEB',
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Box sx={{
                        fontSize: 16, fontWeight: 750,
                        color: selectedDuration === i ? '#fff' : COLORS.dark,
                      }}>
                        {d.label}
                      </Box>
                      <Box sx={{
                        fontSize: 10, mt: 0.25, fontWeight: 500,
                        color: selectedDuration === i ? 'rgba(255,255,255,0.6)' : '#BBB',
                      }}>
                        {d.desc}
                      </Box>
                    </Button>
                  ))}
                </Box>

                {/* Day picker - dynamically generated from available slots */}
                {availableSlots.length > 0 && (
                  <>
                    <Typography sx={{
                      fontSize: 10, fontWeight: 750, textTransform: 'uppercase',
                      letterSpacing: 1, color: COLORS.dark + '40', mb: 1,
                    }}>Select Day</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      {(() => {
                        const groupedByDate = {};
                        availableSlots.forEach(slot => {
                          const date = new Date(slot.start_time);
                          const dateKey = date.toISOString().split('T')[0];
                          if (!groupedByDate[dateKey]) {
                            groupedByDate[dateKey] = date;
                          }
                        });
                        const uniqueDates = Object.entries(groupedByDate)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([, date]) => date);

                        return uniqueDates.map((date, i) => {
                          const dateStr = date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          });
                          return (
                            <Button
                              key={i}
                              sx={{
                                p: '9px 18px', borderRadius: 1, border: 'none',
                                background: i === 0 ? COLORS.dark : '#F0EEEB',
                                color: i === 0 ? '#fff' : '#888',
                                fontSize: 12, fontWeight: 620, cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              Day {i + 1} · {dateStr}
                            </Button>
                          );
                        });
                      })()}
                    </Box>
                  </>
                )}

                {/* Slots */}
                <Typography sx={{
                  fontSize: 10, fontWeight: 750, textTransform: 'uppercase',
                  letterSpacing: 1, color: COLORS.dark + '40', mb: 0.75,
                }}>Available Slots</Typography>
                <Typography sx={{ fontSize: 11.5, color: '#BBB', mb: 1.5 }}>
                  System matched your free times with {selectedAttendee.display_name?.split(' ')[0]}'s · Table auto-assigned on confirmation
                </Typography>

                {slotsLoading ? (
                  <CircularProgress size={24} />
                ) : availableSlots.length === 0 ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>No available slots found. Try a different duration.</Alert>
                ) : (
                  availableSlots.map((slot, i) => {
                    const mins = [5, 10, 15][selectedDuration];
                    const startH = parseInt(slot.start_time?.split('T')[1]?.split(':')[0] || '0');
                    const startM = parseInt(slot.start_time?.split('T')[1]?.split(':')[1] || '0');
                    const endTotal = startH * 60 + startM + mins;
                    const endTime = `${Math.floor(endTotal / 60)}:${String(endTotal % 60).padStart(2, '0')}`;
                    const displayTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
                    return (
                      <Button
                        key={i}
                        onClick={() => setSelectedSlot(i)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, width: '100%',
                          p: '14px 16px', mb: 0.75, borderRadius: 1.25,
                          border: `1.5px solid ${selectedSlot === i ? COLORS.teal : '#E8E4DF'}`,
                          background: selectedSlot === i ? COLORS.teal + '06' : 'transparent',
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Clock size={16} color={selectedSlot === i ? COLORS.teal : '#CCC'} strokeWidth={2} />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ fontSize: 14.5, fontWeight: 620, color: COLORS.dark }}>
                            {displayTime} – {endTime}
                          </Box>
                          <Box sx={{ fontSize: 12, color: '#AAA' }}>
                            During networking · {[5, 10, 15][selectedDuration]} min
                          </Box>
                        </Box>
                        {selectedSlot === i && <CheckCircle size={18} color={COLORS.teal} strokeWidth={2.5} />}
                      </Button>
                    );
                  })
                )}

                {/* Note */}
                <Typography sx={{
                  fontSize: 10, fontWeight: 750, textTransform: 'uppercase',
                  letterSpacing: 1, color: COLORS.dark + '40', mt: 2, mb: 1,
                }}>Add a Note (optional)</Typography>
                <Box sx={{
                  p: '12px 14px', borderRadius: 1.25, border: '1.5px solid #E8E4DF', minHeight: 52,
                  background: '#fff',
                }}>
                  <input
                    type="text"
                    placeholder='e.g. "Would love to discuss deal pipeline"'
                    value={meetingNote}
                    onChange={(e) => setMeetingNote(e.target.value)}
                    style={{
                      width: '100%', fontSize: 13, color: '#666', background: 'transparent',
                      border: 'none', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </Box>

                <Button
                  onClick={handleSendRequest}
                  disabled={selectedSlot === null || submitting}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                    width: '100%', p: '14px', mt: 2, borderRadius: 1.5,
                    border: 'none', background: selectedSlot !== null ? COLORS.primary : '#DDD',
                    color: '#fff', fontSize: 14, fontWeight: 680,
                    cursor: selectedSlot !== null ? 'pointer' : 'default', fontFamily: 'inherit',
                    textTransform: 'none',
                  }}
                >
                  <Send size={16} strokeWidth={2} /> {submitting ? 'Sending...' : 'Send Meeting Request'}
                </Button>
              </Box>

              {/* Right: how it works */}
              <Box sx={{
                p: '16px', borderRadius: 1.5, background: COLORS.bg,
                border: '1px solid #ECEAE6', alignSelf: 'flex-start',
              }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.dark + '50', mb: 1.25 }}>
                  HOW IT WORKS
                </Typography>
                {[
                  { icon: Clock, text: 'You choose: 5, 10, or 15 minutes', color: COLORS.dark },
                  { icon: Search, text: 'System finds slots where you\'re both free', color: COLORS.teal },
                  { icon: Coffee, text: 'A numbered table is auto-assigned', color: COLORS.primary },
                  { icon: MapPin, text: 'Tables are outside main hall, numbered 1–12', color: COLORS.purple },
                  { icon: Bell, text: 'Push notification 5 min before', color: COLORS.gold },
                ].map((s, i) => (
                  <Box key={i} sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.25,
                    p: '8px 0', borderBottom: i < 4 ? '1px solid #E8E4DF' : 'none',
                  }}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: 0.875, background: s.color + '10',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.125,
                    }}>
                      <s.icon size={13} color={s.color} strokeWidth={2} />
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: '#666', lineHeight: 1.4 }}>
                      {s.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* STEP 3: Awaiting */}
        {flowStep === 3 && selectedAttendee && (
          <Box sx={{ textAlign: 'center', p: '40px 20px' }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: 2.5, margin: '0 auto 16px',
              background: COLORS.gold + '10', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={32} color={COLORS.gold} strokeWidth={1.5} />
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 740, color: COLORS.dark, mb: 0.75 }}>
              Request Sent!
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#999', mb: 2.5, maxWidth: 400, mx: 'auto' }}>
              Your meeting request was sent to <strong style={{ color: COLORS.dark }}>
                {selectedAttendee.display_name}
              </strong>. A table number will be assigned once she confirms.
            </Typography>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              p: '10px 18px', borderRadius: 1.25,
              background: COLORS.gold + '08', border: '1px solid ' + COLORS.gold + '18',
              fontSize: 13, color: COLORS.gold, fontWeight: 600,
            }}>
              <Clock size={14} strokeWidth={2} /> Requested: 12:45 · {[5, 10, 15][selectedDuration]} min · Table TBD
            </Box>

            <Box sx={{
              mt: 3, p: '16px', borderRadius: 1.5,
              background: COLORS.bg, maxWidth: 420, mx: 'auto', textAlign: 'left',
            }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.dark + '50', mb: 1 }}>
                WHAT HAPPENS NEXT
              </Typography>
              {[
                { icon: Mail, text: selectedAttendee.display_name?.split(' ')[0] + ' receives an email notification', color: COLORS.teal },
                { icon: Bell, text: 'She also gets an in-app push notification', color: COLORS.primary },
                { icon: CheckCircle, text: 'She can accept, decline, or suggest a different slot', color: COLORS.teal },
                { icon: Coffee, text: 'On accept → system assigns a free table and notifies you both', color: COLORS.purple },
                { icon: AlertCircle, text: 'If no response within 24h, request expires', color: COLORS.gold },
              ].map((s, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  p: '6px 0', fontSize: 13, color: '#666',
                }}>
                  <s.icon size={15} color={s.color} strokeWidth={2} style={{ flexShrink: 0 }} />
                  {s.text}
                </Box>
              ))}
            </Box>

            <Button
              onClick={() => setFlowStep(4)}
              sx={{
                mt: 2.5, p: '10px 24px', borderRadius: 1.25,
                background: COLORS.teal, border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 650, cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                textTransform: 'none',
              }}
            >
              Simulate: {selectedAttendee.display_name?.split(' ')[0]} Accepts <ArrowRight size={14} strokeWidth={2} />
            </Button>
          </Box>
        )}

        {/* STEP 4: Confirmed */}
        {flowStep === 4 && selectedAttendee && (
          <Box sx={{ textAlign: 'center', p: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: 2.5, margin: '0 auto 20px',
              background: COLORS.teal + '10', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={36} color={COLORS.teal} strokeWidth={1.5} />
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 740, color: COLORS.dark, mb: 1 }}>
              Meeting Confirmed!
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#999', mb: 3, maxWidth: 400 }}>
              {selectedAttendee.display_name?.split(' ')[0]} accepted · The system assigned you a table
            </Typography>

            <Box sx={{
              width: '100%', maxWidth: 440, borderRadius: 2, overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(27,42,74,0.08)',
              border: '1px solid ' + COLORS.teal + '20', textAlign: 'left',
            }}>
              <Box sx={{
                p: '16px 18px', background: COLORS.teal + '06',
                display: 'flex', alignItems: 'center', gap: 1.5,
              }}>
                <Avatar
                  src={selectedAttendee.avatar_url}
                  sx={{
                    width: 48, height: 48, borderRadius: 1.5,
                    background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                    fontWeight: 700, fontSize: 16, color: '#fff',
                  }}
                >
                  {selectedAttendee.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 660, color: COLORS.dark }}>
                    {selectedAttendee.display_name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#999' }}>
                    {selectedAttendee.job_title} · {selectedAttendee.company}
                  </Typography>
                </Box>
                <Chip
                  label="Confirmed"
                  size="small"
                  sx={{
                    fontSize: 10, fontWeight: 750, p: '4px 10px',
                    borderRadius: 0.75, background: COLORS.teal + '14', color: COLORS.teal,
                  }}
                />
              </Box>
              <Box sx={{ p: '16px 18px', background: '#fff' }}>
                <Box sx={{ display: 'flex', gap: 2.5, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 14, color: COLORS.dark }}>
                    <Calendar size={15} color={COLORS.teal} strokeWidth={2} />
                    <Typography sx={{ fontWeight: 620 }}>Jun 12</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 14, color: COLORS.dark }}>
                    <Clock size={15} color={COLORS.teal} strokeWidth={2} />
                    <Typography sx={{ fontWeight: 620 }}>12:45 ({[5, 10, 15][selectedDuration]}min)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 14, color: COLORS.dark }}>
                    <Timer size={15} color={COLORS.teal} strokeWidth={2} />
                    <Typography sx={{ fontWeight: 620 }}>Quick chat</Typography>
                  </Box>
                </Box>

                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: '14px 16px', borderRadius: 1.5,
                  background: COLORS.primary + '06', border: '1.5px solid ' + COLORS.primary + '18',
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: 1.5, background: COLORS.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 800, color: '#fff',
                  }}>7</Box>
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 680, color: COLORS.dark }}>
                      Networking Table 7
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#999', mt: 0.25 }}>
                      Outside the main hall, numbered tables area
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1, mt: 1.5,
                  p: '10px 12px', borderRadius: 1, background: COLORS.bg,
                  fontSize: 12, color: '#888',
                }}>
                  <Bell size={13} color={COLORS.gold} strokeWidth={2} />
                  You'll get a push notification 5 minutes before
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, pt: 2, borderTop: '1px solid #F0EEEB' }}>
                <Button
                  sx={{
                    flex: 1, p: '12px 14px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12.5, fontWeight: 640, color: COLORS.teal,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.625,
                    textTransform: 'none', transition: 'all 0.2s',
                    '&:hover': { background: COLORS.teal + '08', borderRadius: 0.75 },
                  }}
                >
                  <MessageSquare size={14} strokeWidth={2} /> Message {selectedAttendee.display_name?.split(' ')[0]}
                </Button>
                <Button
                  sx={{
                    flex: 1, p: '12px 14px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12.5, fontWeight: 640, color: COLORS.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.625,
                    textTransform: 'none', transition: 'all 0.2s',
                    '&:hover': { background: COLORS.primary + '08', borderRadius: 0.75 },
                  }}
                >
                  <X size={14} strokeWidth={2} /> Cancel Meeting
                </Button>
              </Box>
            </Box>

            {/* Other meetings */}
            <Box sx={{ maxWidth: 440, mx: 'auto', mt: 4, textAlign: 'left' }}>
              <Typography sx={{
                fontSize: 10, fontWeight: 750, textTransform: 'uppercase',
                letterSpacing: 1, color: COLORS.dark + '40', mb: 2,
              }}>Your Other Meetings Today</Typography>
              {[
                { name: 'Thomas Richter', company: 'Deutsche Bank', time: '13:00 - 13:15', table: 3, confirmed: true },
                { name: 'Raj Patel', company: 'Tata Consultancy', time: '10:20 - 10:35', table: null, confirmed: false },
              ].map((m, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  p: '14px 16px', borderRadius: 1.25, background: '#fff',
                  mb: 1, border: '1px solid #ECEAE6',
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: COLORS.dark }}>
                      {m.name}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#BBB' }}>
                      {m.company} · {m.time}
                    </Typography>
                  </Box>
                  {m.table ? (
                    <Chip
                      label={`Table ${m.table}`}
                      size="small"
                      sx={{
                        fontSize: 12, fontWeight: 700, p: '6px 12px', borderRadius: 0.75,
                        background: COLORS.primary + '10', color: COLORS.primary, border: `1px solid ${COLORS.primary}30`,
                      }}
                    />
                  ) : (
                    <Chip
                      label="Pending"
                      size="small"
                      sx={{
                        fontSize: 12, fontWeight: 700, p: '6px 12px', borderRadius: 0.75,
                        background: COLORS.gold + '10', color: COLORS.gold, border: `1px solid ${COLORS.gold}30`,
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function MobileView({
  allParticipants,
  loading,
  error,
  searchQuery,
  onSearchChange,
  networkingSettings,
  currentUserId,
  flowStep,
  setFlowStep,
  selectedAttendee,
  setSelectedAttendee,
  selectedDuration,
  setSelectedDuration,
  selectedSlot,
  setSelectedSlot,
  availableSlots,
  slotsLoading,
  meetingNote,
  setMeetingNote,
  submitting,
  handleSendRequest,
}) {
  return (
    <Box sx={{
      width: '100%', height: '100%',
      borderRadius: 0, overflow: 'hidden',
      bgcolor: COLORS.bg, display: 'flex', flexDirection: 'column',
      minHeight: '100vh',
    }}>
      <Box sx={{
        p: '12px 16px', bgcolor: '#fff', borderBottom: '1px solid #F0EEEB',
        display: 'flex', alignItems: 'center', flexShrink: 0,
      }}>
        {flowStep > 1 && (
          <Button
            onClick={() => setFlowStep(Math.max(1, flowStep - 1))}
            sx={{
              background: 'none', border: 'none', cursor: 'pointer', p: 0.5,
              mr: 1,
            }}
          >
            <ArrowLeft size={20} color={COLORS.dark} strokeWidth={2} />
          </Button>
        )}
        <Typography sx={{ flex: 1, fontSize: 16, fontWeight: 720, color: COLORS.dark }}>
          {flowStep === 1 ? 'People' : flowStep === 2 ? 'Request 1:1' :
            flowStep === 3 ? 'Request Sent' : 'Confirmed!'}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* STEP 1: Browse */}
        {flowStep === 1 && (
          <Box sx={{ p: '12px 12px' }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              p: '10px 14px', borderRadius: 1.25, background: '#fff',
              mb: 1.25, border: '1px solid #ECEAE6',
            }}>
              <Search size={15} color="#BBB" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search attendees…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  flex: 1, fontSize: 13, color: '#CCC', background: 'transparent',
                  border: 'none', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </Box>

            {loading && <CircularProgress sx={{ mx: 'auto', display: 'block', my: 4 }} size={32} />}
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            {!loading && allParticipants.length === 0 && !error && (
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#fff' }}>
                <Typography>No participants found.</Typography>
              </Paper>
            )}

            {!loading && allParticipants.length > 0 && (
              <Stack spacing={0.5}>
                {allParticipants.map((p) => (
                  <Box
                    key={`${p.registration_id || 'v'}-${p.user_id}`}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25,
                      p: 1.5, borderRadius: 1.5, bgcolor: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <Avatar
                      src={p.avatar_url}
                      sx={{
                        width: 42, height: 42, borderRadius: 1.4,
                        background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                        fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
                      }}
                    >
                      {p.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625, mb: 0.25 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: COLORS.dark }}>
                          {p.display_name}
                        </Typography>
                        {p.badge_key && p.badge_key !== 'attendee' && (
                          <Chip
                            label={p.badge_label}
                            size="small"
                            sx={{
                              height: 16, fontSize: '0.6rem', fontWeight: 750,
                              backgroundColor: ROLE_CHIP_COLORS[p.badge_key]?.backgroundColor,
                              color: ROLE_CHIP_COLORS[p.badge_key]?.color,
                            }}
                          />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 11.5, color: '#999' }}>
                        {p.job_title || 'Role'} · {p.company || 'Company'}
                      </Typography>
                    </Box>
                    <Button
                      onClick={() => {
                        setFlowStep(2);
                        setSelectedAttendee(p);
                        setSelectedDuration(1);
                        setSelectedSlot(null);
                      }}
                      disabled={!networkingSettings?.enabled || currentUserId === p.user_id}
                      sx={{
                        width: 38, height: 38, borderRadius: 1.25,
                        border: `1.5px solid ${COLORS.teal}25`, background: COLORS.teal + '06',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0, p: 0,
                      }}
                    >
                      <Coffee size={16} color={COLORS.teal} strokeWidth={2} />
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* STEP 2: Pick Time */}
        {flowStep === 2 && selectedAttendee && (
          <Box sx={{ p: '12px 16px' }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.25, p: '12px',
              borderRadius: 1.5, background: '#fff', mb: 1.75,
            }}>
              <Avatar
                src={selectedAttendee.avatar_url}
                sx={{
                  width: 40, height: 40, borderRadius: 1.25,
                  background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                  fontWeight: 700, fontSize: 13, color: '#fff',
                }}
              >
                {selectedAttendee.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 640, color: COLORS.dark }}>
                  {selectedAttendee.display_name}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: '#999' }}>
                  {selectedAttendee.company || 'Company'}
                </Typography>
              </Box>
            </Box>

            {/* Duration picker */}
            <Typography sx={{
              fontSize: 10, fontWeight: 750, textTransform: 'uppercase',
              letterSpacing: 1, color: COLORS.dark + '40', mb: 0.75,
            }}>How Long?</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, mb: 1.75 }}>
              {[
                { mins: 5, label: '5 min', desc: 'Quick intro' },
                { mins: 10, label: '10 min', desc: 'Focused chat' },
                { mins: 15, label: '15 min', desc: 'Deep discussion' },
              ].map((d, i) => (
                <Button
                  key={i}
                  onClick={() => setSelectedDuration(i)}
                  sx={{
                    flex: 1, p: '8px 8px', borderRadius: 1, border: 'none',
                    background: selectedDuration === i ? COLORS.dark : '#fff',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <Box sx={{
                    fontSize: 14, fontWeight: 750,
                    color: selectedDuration === i ? '#fff' : COLORS.dark,
                  }}>
                    {d.label}
                  </Box>
                  <Box sx={{
                    fontSize: 9, mt: 0.125, fontWeight: 500,
                    color: selectedDuration === i ? 'rgba(255,255,255,0.6)' : '#CCC',
                  }}>
                    {d.desc}
                  </Box>
                </Button>
              ))}
            </Box>

            <Typography sx={{
              fontSize: 10, fontWeight: 750, textTransform: 'uppercase',
              letterSpacing: 1, color: COLORS.dark + '40', mb: 0.75,
            }}>Pick a Time</Typography>
            <Typography sx={{ fontSize: 11, color: '#CCC', mb: 1.25 }}>
              Matching both your schedules
            </Typography>

            {slotsLoading ? (
              <CircularProgress size={24} />
            ) : availableSlots.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 1.5 }}>No available slots found. Try a different duration.</Alert>
            ) : (
              availableSlots.map((slot, i) => {
                const mins = [5, 10, 15][selectedDuration];
                const startH = parseInt(slot.start_time?.split('T')[1]?.split(':')[0] || '0');
                const startM = parseInt(slot.start_time?.split('T')[1]?.split(':')[1] || '0');
                const endTotal = startH * 60 + startM + mins;
                const endTime = `${Math.floor(endTotal / 60)}:${String(endTotal % 60).padStart(2, '0')}`;
                const displayTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
                return (
                  <Button
                    key={i}
                    onClick={() => setSelectedSlot(i)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25, width: '100%',
                      p: '12px', mb: 0.75, borderRadius: 1.25,
                      border: `1.5px solid ${selectedSlot === i ? COLORS.teal : '#E8E4DF'}`,
                      background: selectedSlot === i ? COLORS.teal + '06' : '#fff',
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    <Clock size={14} color={selectedSlot === i ? COLORS.teal : '#CCC'} strokeWidth={2} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ fontSize: 13.5, fontWeight: 600, color: COLORS.dark }}>
                        {displayTime} – {endTime}
                      </Box>
                      <Box sx={{ fontSize: 11, color: '#BBB' }}>
                        During networking · {[5, 10, 15][selectedDuration]} min
                      </Box>
                    </Box>
                    {selectedSlot === i && <CheckCircle size={16} color={COLORS.teal} strokeWidth={2.5} />}
                  </Button>
                );
              })
            )}

            <Box sx={{
              p: '12px', mt: 1, borderRadius: 1.25,
              border: '1.5px solid #E8E4DF', background: '#fff', minHeight: 44,
            }}>
              <input
                type="text"
                placeholder="Add a note (optional)…"
                value={meetingNote}
                onChange={(e) => setMeetingNote(e.target.value)}
                style={{
                  width: '100%', fontSize: 12.5, color: '#CCC', background: 'transparent',
                  border: 'none', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </Box>

            <Button
              onClick={handleSendRequest}
              disabled={selectedSlot === null || submitting}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.875,
                width: '100%', p: '14px', mt: 1.75, borderRadius: 1.5,
                border: 'none', background: selectedSlot !== null ? COLORS.primary : '#DDD',
                color: '#fff', fontSize: 14, fontWeight: 660,
                cursor: selectedSlot !== null ? 'pointer' : 'default', fontFamily: 'inherit',
                textTransform: 'none',
              }}
            >
              <Send size={15} strokeWidth={2} /> {submitting ? 'Sending...' : 'Send Request'}
            </Button>
          </Box>
        )}

        {/* STEP 3: Awaiting */}
        {flowStep === 3 && selectedAttendee && (
          <Box sx={{ p: '40px 20px', textAlign: 'center' }}>
            <Box sx={{
              width: 60, height: 60, borderRadius: 2, margin: '0 auto 14px',
              background: COLORS.gold + '10', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={26} color={COLORS.gold} strokeWidth={1.5} />
            </Box>
            <Typography sx={{ fontSize: 17, fontWeight: 740, color: COLORS.dark, mb: 0.5 }}>
              Request Sent!
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#999', mb: 1.75 }}>
              Waiting for {selectedAttendee.display_name?.split(' ')[0]} to respond.
              <br />Table assigned on confirmation.
            </Typography>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              p: '8px 14px', borderRadius: 1, background: COLORS.gold + '08',
              fontSize: 12, color: COLORS.gold, fontWeight: 600,
            }}>
              <Clock size={12} strokeWidth={2} /> 12:45 · {[5, 10, 15][selectedDuration]} min · Table TBD
            </Box>

            <Box sx={{
              mt: 2, textAlign: 'left', p: '14px',
              borderRadius: 1.5, background: '#fff',
            }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: COLORS.dark + '40', mb: 1 }}>
                NEXT
              </Typography>
              {[
                `${selectedAttendee.display_name?.split(' ')[0]} gets email + push notification`,
                'She can accept, decline, or suggest another time',
                'Table auto-assigned when confirmed',
                'You\'ll get a notification 5 min before',
              ].map((t, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  p: '5px 0', fontSize: 12, color: '#777',
                }}>
                  <CheckCircle size={12} color={COLORS.teal} strokeWidth={2} style={{ flexShrink: 0 }} /> {t}
                </Box>
              ))}
            </Box>

            <Button
              onClick={() => setFlowStep(4)}
              sx={{
                mt: 1.75, p: '10px 18px', borderRadius: 1.25,
                background: COLORS.teal, border: 'none', color: '#fff',
                fontSize: 12, fontWeight: 650, cursor: 'pointer', fontFamily: 'inherit',
                textTransform: 'none',
              }}
            >
              Simulate: {selectedAttendee.display_name?.split(' ')[0]} Accepts →
            </Button>
          </Box>
        )}

        {/* STEP 4: Confirmed */}
        {flowStep === 4 && selectedAttendee && (
          <Box sx={{ p: '24px 14px' }}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: 2, margin: '0 auto 10px',
                background: COLORS.teal + '10', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={26} color={COLORS.teal} strokeWidth={1.5} />
              </Box>
              <Typography sx={{ fontSize: 17, fontWeight: 740, color: COLORS.dark }}>
                It\'s a Date!
              </Typography>
            </Box>

            <Box sx={{
              borderRadius: 1.75, overflow: 'hidden', border: '1px solid ' + COLORS.teal + '20',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.25,
                p: '12px 14px', background: COLORS.teal + '06',
              }}>
                <Avatar
                  src={selectedAttendee.avatar_url}
                  sx={{
                    width: 40, height: 40, borderRadius: 1.25,
                    background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                    fontWeight: 700, fontSize: 13, color: '#fff',
                  }}
                >
                  {selectedAttendee.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 640, color: COLORS.dark }}>
                    {selectedAttendee.display_name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#999' }}>
                    {selectedAttendee.company || 'Company'}
                  </Typography>
                </Box>
                <Chip
                  label="Confirmed"
                  size="small"
                  sx={{
                    fontSize: 9, fontWeight: 750, p: '3px 8px',
                    borderRadius: 0.625, background: COLORS.teal + '14', color: COLORS.teal,
                  }}
                />
              </Box>
              <Box sx={{ p: '12px 14px', background: '#fff' }}>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 1.25, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 12.5, color: COLORS.dark, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Calendar size={13} color={COLORS.teal} strokeWidth={2} /> <strong>Jun 12</strong>
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: COLORS.dark, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock size={13} color={COLORS.teal} strokeWidth={2} /> <strong>12:45 ({[5, 10, 15][selectedDuration]}m)</strong>
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: COLORS.dark, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Timer size={13} color={COLORS.teal} strokeWidth={2} /> <strong>Quick chat</strong>
                  </Typography>
                </Box>

                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  p: '12px', borderRadius: 1.25,
                  background: COLORS.primary + '06', border: '1.5px solid ' + COLORS.primary + '15',
                }}>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: 1.375, background: COLORS.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, color: '#fff',
                  }}>7</Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 660, color: COLORS.dark }}>
                      Networking Table 7
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: '#999' }}>
                      Outside the main hall
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.25,
                  p: '8px 10px', borderRadius: 0.875, background: COLORS.gold + '06',
                  fontSize: 11.5, color: COLORS.gold, fontWeight: 580,
                }}>
                  <Bell size={12} strokeWidth={2} /> Push notification 5 min before
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button
                sx={{
                  flex: 1, p: '12px', borderRadius: 1.25, border: '1.5px solid #E0DCD7',
                  background: '#fff', fontSize: 12, fontWeight: 620, color: COLORS.dark,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.625,
                  textTransform: 'none',
                }}
              >
                <MessageSquare size={13} strokeWidth={2} /> Message {selectedAttendee.display_name?.split(' ')[0]}
              </Button>
              <Button
                sx={{
                  flex: 1, p: '12px', borderRadius: 1.25, border: '1.5px solid #E0DCD7',
                  background: '#fff', fontSize: 12, fontWeight: 620, color: '#CC4422',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.625,
                  textTransform: 'none',
                }}
              >
                <X size={13} strokeWidth={2} /> Cancel
              </Button>
            </Box>

            {/* YOUR OTHER MEETINGS TODAY */}
            <Box sx={{ maxWidth: 440, mx: 'auto', mt: 4, textAlign: 'left' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 680, color: COLORS.dark, mb: 2 }}>
                YOUR OTHER MEETINGS TODAY
              </Typography>
              {[
                { attendee: 'Mike Chen', time: '2:00 - 2:15 PM', table: 'Table 3', duration: '15 min' },
                { attendee: 'Lisa Wong', time: '3:30 - 3:40 PM', table: 'Table 5', duration: '10 min' },
                { attendee: 'Carlos Rodriguez', time: '4:15 - 4:20 PM', pending: true, duration: '5 min' },
              ].map((m, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25, p: '12px 14px', mb: 1,
                    border: '1px solid #E8DDD4', borderRadius: 1.25, background: '#fff',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36, height: 36, borderRadius: 1, fontSize: 12, fontWeight: 700,
                      background: `linear-gradient(135deg, ${COLORS.purple}, #9B4FB5)`, color: '#fff',
                    }}
                  >
                    {m.attendee.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 620, color: COLORS.dark }}>
                      {m.attendee}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#999' }}>
                      {m.time}
                    </Typography>
                  </Box>
                  <Chip
                    label={m.pending ? 'Pending' : m.table}
                    size="small"
                    sx={{
                      fontSize: 9, fontWeight: 650, p: '2px 8px', borderRadius: 0.5,
                      background: m.pending ? '#FFE8E8' : COLORS.primary + '14',
                      color: m.pending ? '#CC4422' : COLORS.primary,
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function EventCompanionDirectoryPage() {
  const { slug } = useParams();
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Existing state
  const [event, setEvent] = useState(null);
  const [allParticipants, setAllParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [networkingSettings, setNetworkingSettings] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [scheduleAvailable, setScheduleAvailable] = useState(false);
  const [myMeetings, setMyMeetings] = useState([]);

  // New flow state
  const [flowStep, setFlowStep] = useState(1); // 1=Browse, 2=Pick Time, 3=Awaiting, 4=Confirmed
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(1); // index: 0=5min, 1=10min, 2=15min
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [meetingNote, setMeetingNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoveredAttendee, setHoveredAttendee] = useState(null);

  const debounceTimer = useRef(null);
  const slotsAbortController = useRef(null);

  // Handle tab and meeting query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'meetings') {
      setActiveTab(1);
    }
  }, [location.search]);

  // Fetch event
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${slug}/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to load event');
        const data = await res.json();
        setEvent(data);
      } catch (err) {
        setEvent({ title: 'Event Conference', slug: slug });
      }
    };
    if (slug) {
      setEvent({ title: 'Event Conference', slug: slug });
      fetchEvent();
    }
  }, [slug, token]);

  // Get current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        if (!token) return;
        const res = await fetch(`${API_BASE}/users/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          const firstName = user.first_name || '';
          const lastName = user.last_name || '';
          const initials = (firstName[0] + lastName[0]).toUpperCase();
          setUserInitials(initials);
          setCurrentUserId(user.id);
        }
      } catch (err) {
        setUserInitials('');
      }
    };
    fetchCurrentUser();
  }, [token]);

  // Fetch networking settings
  useEffect(() => {
    if (!event?.id) return;

    const fetchNetworkingSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${event.id}/networking-settings/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const settings = await res.json();
          setNetworkingSettings(settings);
        } else {
          setNetworkingSettings(null);
        }
      } catch (err) {
        setNetworkingSettings(null);
      }
    };

    fetchNetworkingSettings();
  }, [event?.id, token]);

  // Check schedule availability
  useEffect(() => {
    if (!event?.id || !token) return;

    const checkSchedule = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${event.id}/schedule/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          setScheduleAvailable(false);
          return;
        }
        const data = await res.json();
        setScheduleAvailable(data.days && data.days.some(d => d.sessions && d.sessions.length > 0));
      } catch (err) {
        setScheduleAvailable(false);
      }
    };

    checkSchedule();
  }, [event?.id, token]);

  // Fetch directory
  useEffect(() => {
    if (!event?.id) return;

    const fetchDirectory = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('q', searchQuery);

        const res = await fetch(
          `${API_BASE}/events/${event.id}/companion-directory/?${params.toString()}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail || 'Access denied.');
        }
        if (!res.ok) throw new Error('Failed to load directory');

        const data = await res.json();
        setAllParticipants(data.participants || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fetchDirectory, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [event?.id, token, searchQuery]);

  // Fetch available slots when attendee and duration change
  useEffect(() => {
    if (!selectedAttendee || flowStep !== 2 || !event?.id) return;

    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const durations = [5, 10, 15];
        const duration = durations[selectedDuration];

        const res = await fetch(
          `${API_BASE}/events/${event.id}/networking-meetings/availability/?recipient_registration_id=${selectedAttendee.registration_id}&duration_minutes=${duration}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (!res.ok) throw new Error('Failed to load available slots');

        const data = await res.json();
        const slots = Array.isArray(data) ? data : (data.available_slots || []);
        setAvailableSlots(slots);
        setSelectedSlot(null);
      } catch (err) {
        setAvailableSlots([]);
        toast.error(err.message);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedAttendee, selectedDuration, flowStep, event?.id, token]);

  // Handle send meeting request
  const handleSendRequest = async () => {
    if (!selectedAttendee || selectedSlot === null || !event?.id) return;

    setSubmitting(true);
    try {
      const durations = [5, 10, 15];
      const duration = durations[selectedDuration];
      const slot = availableSlots[selectedSlot];

      if (!slot) throw new Error('No slot selected');

      const res = await fetch(`${API_BASE}/events/${event.id}/networking-meetings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_registration_id: selectedAttendee.registration_id,
          duration_minutes: duration,
          start_time: slot.start_time,
          message: meetingNote,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.message || 'Failed to create meeting');
      }

      toast.success('Meeting request sent!');
      setFlowStep(3);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!event && loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !event) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <>
      <Helmet>
        <title>{event?.title || 'Event'} - Participant Directory</title>
      </Helmet>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: COLORS.bg,
      }}>
        {/* Tab Navigation - Only show when in browse mode */}
        {networkingSettings?.enabled && flowStep === 1 && (
          <Box sx={{
            bgcolor: '#fff',
            borderBottom: '1px solid #F0EEEB',
            display: 'flex',
            alignItems: 'center',
            px: isMobile ? 2 : 3,
          }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTabs-indicator': { backgroundColor: COLORS.teal, height: 3 },
              }}
            >
              <Tab
                label="Directory"
                sx={{
                  textTransform: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  color: activeTab === 0 ? COLORS.teal : '#999',
                  minHeight: 50,
                }}
              />
              <Tab
                label="My Meetings"
                sx={{
                  textTransform: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  color: activeTab === 1 ? COLORS.teal : '#999',
                  minHeight: 50,
                }}
              />
              {scheduleAvailable && (
                <Tab
                  label="Schedule"
                  sx={{
                    textTransform: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    color: activeTab === 2 ? COLORS.teal : '#999',
                    minHeight: 50,
                  }}
                />
              )}
            </Tabs>
          </Box>
        )}

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: isMobile ? 0 : 2 }}>
          {activeTab === 0 && flowStep > 1 ? (
            // Show flow views
            isMobile ? (
              <MobileView
                allParticipants={allParticipants}
                loading={loading}
                error={error}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                networkingSettings={networkingSettings}
                currentUserId={currentUserId}
                flowStep={flowStep}
                setFlowStep={setFlowStep}
                selectedAttendee={selectedAttendee}
                setSelectedAttendee={setSelectedAttendee}
                selectedDuration={selectedDuration}
                setSelectedDuration={setSelectedDuration}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                availableSlots={availableSlots}
                slotsLoading={slotsLoading}
                meetingNote={meetingNote}
                setMeetingNote={setMeetingNote}
                submitting={submitting}
                handleSendRequest={handleSendRequest}
              />
            ) : (
              <DesktopView
                event={event}
                allParticipants={allParticipants}
                loading={loading}
                error={error}
                userInitials={userInitials}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                networkingSettings={networkingSettings}
                currentUserId={currentUserId}
                flowStep={flowStep}
                setFlowStep={setFlowStep}
                selectedAttendee={selectedAttendee}
                setSelectedAttendee={setSelectedAttendee}
                selectedDuration={selectedDuration}
                setSelectedDuration={setSelectedDuration}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                availableSlots={availableSlots}
                slotsLoading={slotsLoading}
                meetingNote={meetingNote}
                setMeetingNote={setMeetingNote}
                submitting={submitting}
                handleSendRequest={handleSendRequest}
                myMeetings={myMeetings}
                onHoveredAttendee={setHoveredAttendee}
                hoveredAttendee={hoveredAttendee}
              />
            )
          ) : activeTab === 1 ? (
            <MyMeetingsView
              eventId={event?.id}
              currentUserId={currentUserId}
              networkingSettings={networkingSettings}
              isMobile={isMobile}
            />
          ) : activeTab === 2 ? (
            <ScheduleTab
              eventId={event?.id}
              token={token}
              isMobile={isMobile}
              currentUserId={currentUserId}
            />
          ) : (
            // Default directory view
            isMobile ? (
              <MobileView
                allParticipants={allParticipants}
                loading={loading}
                error={error}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                networkingSettings={networkingSettings}
                currentUserId={currentUserId}
                flowStep={flowStep}
                setFlowStep={setFlowStep}
                selectedAttendee={selectedAttendee}
                setSelectedAttendee={setSelectedAttendee}
                selectedDuration={selectedDuration}
                setSelectedDuration={setSelectedDuration}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                availableSlots={availableSlots}
                slotsLoading={slotsLoading}
                meetingNote={meetingNote}
                setMeetingNote={setMeetingNote}
                submitting={submitting}
                handleSendRequest={handleSendRequest}
              />
            ) : (
              <DesktopView
                event={event}
                allParticipants={allParticipants}
                loading={loading}
                error={error}
                userInitials={userInitials}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                networkingSettings={networkingSettings}
                currentUserId={currentUserId}
                flowStep={flowStep}
                setFlowStep={setFlowStep}
                selectedAttendee={selectedAttendee}
                setSelectedAttendee={setSelectedAttendee}
                selectedDuration={selectedDuration}
                setSelectedDuration={setSelectedDuration}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                availableSlots={availableSlots}
                slotsLoading={slotsLoading}
                meetingNote={meetingNote}
                setMeetingNote={setMeetingNote}
                submitting={submitting}
                handleSendRequest={handleSendRequest}
                myMeetings={myMeetings}
                onHoveredAttendee={setHoveredAttendee}
                hoveredAttendee={hoveredAttendee}
              />
            )
          )}
        </Box>
      </Box>
    </>
  );
}

export default EventCompanionDirectoryPage;
