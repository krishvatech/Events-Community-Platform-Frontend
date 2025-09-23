import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Typography,
  Button,
  Link,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  EventAvailable as EventAvailableIcon,
  Forum as ForumIcon,
  Folder as FolderIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import { CustomRegisterIcon,CustomDiscussionIcon,CustomAccessIcon,CustomProfile} from "../components/CustomIcons"; 
const theme = createTheme({
  palette: {
    primary: { main: '#1bbbb3' },
    background: { default: '#f6f8f8', paper: '#ffffff' },
    text: { primary: '#1f2937', secondary: '#6b7280' },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700 },
    h3: { fontSize: '1.25rem', fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid rgba(27, 187, 179, 0.1)',
        },
      },
    },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: '8px' } } },
  },
});
const Dashboard = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const handleDrawerToggle = () => setMobileOpen((v) => !v);
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Header handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box sx={{ display: 'flex', flex: 1 }}>
          {/* Sidebar reserves 256px by itself; no extra margin needed */}
          <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
          {/* MAIN */}
          <Box component="main"
            sx={{
              flexGrow: 1,
              px: { xs: 3, md: 6 },
              py: { xs: 3, md: 6 },     // modest, balanced padding
              pb: { xs: 2, md: 3 }, 
            }}
          >
            {/* Welcome */}
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h1"
                sx={{ mb: 2, color: 'text.primary', fontSize:36, textAlign: { xs: 'center', md: 'left' } }}
              >
                Welcome back, [User Name]!
              </Typography>
              <Typography variant="h6" sx={{ color: 'text.secondary',fontSize:18, textAlign: { xs: 'center', md: 'left' } }}>
                Here's a summary of your activity and upcoming opportunities.
              </Typography>
            </Box>
            {/* Top row — force 3 across from md */}
            {/* Top row — 3 across from md (compact height) */}
            <Box
              sx={{
                mb: 4,
                display: 'grid',
                gap: { xs: 2, md: 2.5 },                       // tighter gaps
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, minmax(0, 1fr))',              // exactly 3 columns from md+
                },
                alignItems: 'start',
              }}
            >
              {/* Card 1 */}
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2, md: 2.25 }, pb: { xs: 2, md: 2.25 } }}>
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: 'text.primary',fontSize: 20 }}>
                    Upcoming Events for You
                  </Typography>

                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                          The Annual M&A Summit
                        </Typography>
                        <Typography variant="body2" color="text.secondary">October 26, 2024</Typography>
                      </Box>
                      <Button variant="contained" size="small" color="primary" sx={{ flexShrink: 0,color: 'common.white', }}>
                        View
                      </Button>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                          Networking Mixer for Dealmakers
                        </Typography>
                        <Typography variant="body2" color="text.secondary">November 10, 2024</Typography>
                      </Box>
                      <Button variant="contained" size="small" color="primary" sx={{ flexShrink: 0 ,color: 'common.white',}}>
                        View
                      </Button>
                    </Box>

                    <Link
                      href="#"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 600,
                        mt: 1,                                  // was 2
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      See All Events
                    </Link>
                  </Stack>
                </CardContent>
              </Card>

              {/* Card 2 */}
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2, md: 2.25 }, pb: { xs: 2, md: 2.25 } }}>
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: 'text.primary',fontSize: 20 }}>
                    Recent Community Activity
                  </Typography>

                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Avatar
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdSPl7HlGanqF5RiHaWSVQ9QI2CYal_9-3lhgFRuUcj0LJ7FyigScYCf42bDup4QYrla0Aln-C46uqeXJhIAksFjdBMKfMlx_XL76mZWGp5BfQfXPY5QK2DoXBXPXXgOu-5o9NfaoHXbPutMkZQKI90QZLq2rz60xJrX6Ai2ZtuTA-p3Z7OmGbaSqKCuLIgLgHHa3cZbj2wjcEa2RzvP2CsMOmz4Ele0pUh4DmzsREvZpWCqFWyomvrXSxSqxYLdpE8Rqhp6NOVw"
                        sx={{ width: 40, height: 40, flexShrink: 0 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Sarah Chen posted:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Excited to share my insights on recent market trends...
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Avatar
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQW-ZoVKENpsFY1tjGkibf08ZkqKxluVLOwsfGJgAXDPQe3ARaxI0Fpq8kvwyPzBs_xUqZ99oTq0tCiEIBdPjYmlXmuJaQ_NNWaJJ4Slt0Is4kMTPG7EBC4DGWIkdkjA4PG8kTikw8UF-U_yf8mdO89_yz10W74VT6tRaEJwPFzMHfhN_pJTYCN4vP9c8p67yFfQrKgTOqNZs_u7vwTAVuNqlWDxuMSUDiOoVQ4RjquGzVTeIuaFu1lUidUFC-Z1pk7-ZY-j9M8A"
                        sx={{ width: 40, height: 40, flexShrink: 0 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          New Discussion: Valuation Strategies
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Join the conversation about effective valuation methods...
                        </Typography>
                      </Box>
                    </Box>

                    <Link
                      href="#"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 600,
                        mt: 1,                                   // was 2
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Visit Community
                    </Link>
                  </Stack>
                </CardContent>
              </Card>

              {/* Card 3 */}
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2, md: 2.25 }, pb: { xs: 2, md: 2.25 } }}>
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: 'text.primary',fontSize: 20 }}>
                    Recommended Resources
                  </Typography>

                  <Stack spacing={1.25}>
                    {[
                      'Guide to M&A Due Diligence',
                      'Top 5 M&A Trends for 2024',
                      'Webinar: Navigating Deal Complexity',
                    ].map((resource, i) => (
                      <Link
                        key={i}
                        href="#"
                        sx={{
                          color: 'text.primary',
                          textDecoration: 'none',
                          fontWeight: 500,
                          '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                        }}
                      >
                        {resource}
                      </Link>
                    ))}

                    <Link
                      href="#"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 600,
                        mt: 1,                                   // was 2
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Explore All Resources
                    </Link>
                  </Stack>
                </CardContent>
              </Card>
            </Box>


            {/* Bottom row — force 2 across from md, equal heights */}
            <Box
              sx={{
                mb: 6,
                display: 'grid',
                gap: { xs: 2, md: 3 },
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0,1fr))' },
                alignItems: 'stretch',
              }}
            >
              {/* Your Network */}
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: 'text.primary',fontSize: 20 }}>
                    Your Network
                  </Typography>

                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpUlccQRm1PXSS0loNs-FKCqJTs4a7F_YMYhd-hWRaPT2NmhXcGfJSEbAEXEiV1YJWFOPV2ZFhpmcXmvvCxdK8LvzQevucug9zBpmskeywIkcStxazGqZ6pNPZk3PCYgx7DTh5lMxamy0J8FQ91lyswO3lzn5ReWAmmE9XvkrBuHhhaK3K9f97ozDa_VcaF_Jnhf-cdNxLVeU85fS7w_5zed_VX1KW1lhohLNn2fXdZs4djuNERHa-la-kQoGfpE36EWIB4qn3oQ"
                        sx={{ width: 40, height: 40 }}
                      />
                      <Box>
                        <Typography fontWeight={600}>David Lee</Typography>
                        <Typography variant="body2" color="text.secondary">M&A Advisor</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHKjDgAAMcSOy6ZsGC9_IG-SmJR4XLhvxvQGjuOs4Vuj9EicNWSohpqOz76rcop0_KtYJrD--JYG3XgdfGUjjLTc3VGAcREdHC66b7TYZ4fPy8Y127xDhvRyqXhdIPcLHnc3HOlh5-AMjErYzkAy0kfaaB9WwKYbooqpeoZ6iKUZbT5fdW_JOy4Qxs-rxvaw3uA-K7_vFbg1N1_yZcmCEZ-PISeaU89b1Noeujcgstqz_vZozsyNQS0PlCf6gSc1ZgeVqz2-06iw"
                        sx={{ width: 40, height: 40 }}
                      />
                      <Box>
                        <Typography fontWeight={600}>Maria Garcia</Typography>
                        <Typography variant="body2" color="text.secondary">Investment Banker</Typography>
                      </Box>
                    </Box>

                    <Link
                      href="#"
                      sx={{ color: 'primary.main', fontWeight: 700, mt: 1, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      View Connections
                    </Link>
                  </Stack>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: 'text.primary',fontSize: 20 }}>
                    Quick Actions
                  </Typography>

                  {/* neat 2×2 button grid */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <Button
                      variant="outlined"
                      startIcon={<CustomRegisterIcon sx={{ fontSize: 22 }} />} // size tweak optional
                      sx={{
                        bgcolor: 'rgba(27,187,179,0.2)',
                        border: 'none',
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'rgba(27,187,179,0.3)', border: 'none' },
                      }}
                    >
                      Register for Event
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CustomDiscussionIcon sx={{ fontSize: 22 }} />} // size tweak optional
                      sx={{
                        bgcolor: 'rgba(27,187,179,0.2)',
                        border: 'none',
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'rgba(27,187,179,0.3)', border: 'none' },
                      }}
                    >
                      Join Discussion
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CustomAccessIcon sx={{ fontSize: 22 }} />} // size tweak optional
                      sx={{
                        bgcolor: 'rgba(27,187,179,0.2)',
                        border: 'none',
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'rgba(27,187,179,0.3)', border: 'none' },
                      }}
                    >
                      Access Resources
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CustomProfile sx={{ fontSize: 22 }} />} // size tweak optional
                      sx={{
                        bgcolor: 'rgba(27,187,179,0.2)',
                        border: 'none',
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'rgba(27,187,179,0.3)', border: 'none' },
                      }}
                    >
                      My Profile
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>

          </Box>
        </Box>
        <Footer />
      </Box>
    </ThemeProvider>
  );
};
export default Dashboard;