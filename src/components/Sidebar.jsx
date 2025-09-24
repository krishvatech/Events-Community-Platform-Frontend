import React from 'react';
import {
  Box, List, ListItem, ListItemIcon, ListItemText, Drawer,
  useTheme, useMediaQuery
} from '@mui/material';

import { CustomDashboardIcon, CustomEventIcon,CustomCommunityIcon,CustomResourcesIcon,CustomSettingsIcon} from '../components/CustomIcons';

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const sidebarItems = [
  { text: 'Dashboard', icon: <CustomDashboardIcon />, active: true },
  { text: 'My Events', icon: <CustomEventIcon />, active: false },
  { text: 'Community', icon: <CustomCommunityIcon />, active: false },
  { text: 'Resources', icon: <CustomResourcesIcon />, active: false },
  { text: 'Settings', icon: <CustomSettingsIcon />, active: false },
];

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#f9fafb', pt: 2 }}>
      <List sx={{ px: 1 }}>
        {sidebarItems.map((item) => (
          <ListItem
            key={item.text}
            sx={{
              mb: 1,
              borderRadius: 0,
              bgcolor: item.active ? 'transparent' : 'transparent',
              color: item.active ? '#ffffff' : '#14b8b1',
              '&:hover': { 
                bgcolor: '#e6f7f6', // Light teal background on hover
                borderRadius: 1,
                color: '#14b8b1', // Teal font color on hover
                '& .MuiListItemIcon-root': {
                  color: '#14b8b1', // Teal icon color on hover
                },
                '& .MuiListItemText-primary': {
                  color: '#14b8b1', // Teal text color on hover
                },
              },
              cursor: 'pointer',
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                display: 'flex',
                alignItems: 'center',
                color: item.active ? '#14b8b1' : '#525252',
                '& svg': {
                  display: 'block',
                  fontSize: 24,
                },
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              sx={{
                '& .MuiListItemText-primary': {
                  fontWeight: item.active ? 600 : 500,
                  fontSize: '0.95rem',
                  color: item.active ? '#14b8b1' : '#525252',
                },
              }}
            />
          </ListItem>
        ))}
      </List>

    </Box>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              borderRadius: 0,   
              width: 256,
              
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 256,
              position: 'relative',
              borderRadius: 0,   
             
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;
