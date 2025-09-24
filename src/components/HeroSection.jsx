import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { School as SchoolIcon, EmojiEvents as EmojiEventsIcon } from '@mui/icons-material';

const HeroSection = () => {
  const illustrationUrl =
    'https://images.unsplash.com/photo-1755548413928-4aaeba7c740e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBuZXR3b3JraW5nJTIwZWR1Y2F0aW9uJTIwbGVhcm5pbmd8ZW58MXx8fHwxNzU3OTI0ODEzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

  return (
    <Box
      component="section"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: { xs: 1.5, md: 3 },
        px: 0,
        pt: 18,   // keep top padding
        pb: 0,   // remove bottom padding
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
        mx: 0,
        width: '100%',
        // lighter gradient background like your 2nd image
        background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      }}
    >
      {/* Badge */}
      <Box sx={{ position: 'relative', mb: 1 }}>
        <Paper
          elevation={6}
          sx={{
            height: 64,
            width: 64,
            borderRadius: '22px',
            transform: 'scaleX(-1)',
            bgcolor: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SchoolIcon sx={{ fontSize: 30 }} />
        </Paper>

        <Box
          sx={{
            position: 'absolute',
            top: -6,
            right: -6,
            height: 20,
            width: 20,
            borderRadius: '50%',
            bgcolor: '#FACC15', // yellow-400
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 12 }} />
        </Box>
      </Box>

      {/* Headings */}
      <Typography
        component="h1"
        sx={{
          fontWeight: 400,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          fontSize: 28,
        }}
      >
        IMAA Institute
      </Typography>

      <Typography
        sx={{
          mt: 0.5,
          fontWeight: 300,
          lineHeight: 1.3,
          fontSize: 20,
        }}
      >
        Events &amp; Community Hub
      </Typography>

      {/* Image card */}
      <Box sx={{ width: '100%', maxWidth: 520, mt: 1.5, px: { xs: 1, sm: 0 } }}>
        <Box
          component="img"
          src={illustrationUrl}
          alt="Learning session"
          sx={{
            width: '100%',
            borderRadius: 4, // ~ rounded-2xl
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.15)',
            objectFit: 'cover',
            objectPosition: 'left',
            // aspect ratio: 16/9 (xs) -> 16/7 (sm+)
            aspectRatio: { xs: '16 / 9', sm: '16 / 7' },
            display: 'block',
          }}
        />
      </Box>

      {/* Description */}
      <Typography
        sx={{
          mt: 3,
          mx: 'auto',
          px: { xs: 1, sm: 1.5 },
          maxWidth: { xs: 700, md: 820 },
          fontSize: { xs: 14, sm: 16, md: 15 },
          lineHeight: 1.8,
          letterSpacing: '0.01em',
          color: 'rgba(255,255,255,0.95)',
          textShadow: '0 1px 1px rgba(0,0,0,0.25)', 
          textAlign: 'center',
        }}
      >
        Connect with industry professionals, advance your career
        <br></br>
        through continuous learning, and participate in transformative
        <br></br>
        events that shape the future of your field.
      </Typography>
    </Box>
  );
};

export default HeroSection;
