import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useMediaQuery,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import VideocamIcon from '@mui/icons-material/Videocam';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Strategies', path: '/strategies', icon: <TipsAndUpdatesIcon /> },
  { label: 'Daily Log', path: '/daily', icon: <EditNoteIcon /> },
  { label: 'Gratitude', path: '/gratitude', icon: <VolunteerActivismIcon /> },
  { label: 'Matchup', path: '/matchup', icon: <FavoriteIcon /> },
  { label: 'Assessments', path: '/assessments', icon: <AssignmentIcon /> },
  { label: 'Reports', path: '/reports', icon: <AssessmentIcon /> },
  { label: 'Meetings', path: '/meetings', icon: <VideocamIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

const bottomNavItems = [
  { label: 'Home', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Strategy', path: '/strategies', icon: <EmojiObjectsIcon /> },
  { label: 'Log', path: '/daily', icon: <EditNoteIcon /> },
  { label: 'Matchup', path: '/matchup', icon: <FavoriteIcon /> },
  { label: 'More', path: null, icon: <MoreHorizIcon /> },
];

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleNavigation = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getCurrentNavIndex = () => {
    const index = bottomNavItems.findIndex(
      item => item.path && location.pathname.startsWith(item.path)
    );
    return index >= 0 ? index : -1;
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || user.email[0]}`.toUpperCase()
    : '?';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" color="inherit" elevation={0}>
        <Toolbar variant={isMobile ? 'dense' : 'regular'}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <FavoriteIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Marriage Rescue
          </Typography>

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              {userInitials}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem disabled>
              <Typography variant="body2">{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Side Drawer (desktop or mobile menu) */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        sx={{
          display: isMobile ? 'block' : { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            mt: { xs: '48px', md: '64px' },
            height: { xs: 'calc(100% - 48px)', md: 'calc(100% - 64px)' },
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <List>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          mt: { xs: '48px', md: '64px' },
          mb: isMobile ? '56px' : 0,
          ml: isMobile ? 0 : '240px',
          bgcolor: 'background.default',
          minHeight: { xs: 'calc(100vh - 48px)', md: 'calc(100vh - 64px)' },
        }}
      >
        <Outlet />
      </Box>

      {/* Bottom Navigation (mobile only) */}
      {isMobile && (
        <Paper
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}
          elevation={3}
        >
          <BottomNavigation
            value={getCurrentNavIndex()}
            onChange={(_, newValue) => {
              const item = bottomNavItems[newValue];
              if (item.path === null) {
                setDrawerOpen(true);
              } else {
                handleNavigation(item.path);
              }
            }}
            showLabels
          >
            {bottomNavItems.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default Layout;
