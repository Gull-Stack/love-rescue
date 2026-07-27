import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  ListSubheader,
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
import SchoolIcon from '@mui/icons-material/School';
import EditNoteIcon from '@mui/icons-material/EditNote';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import VideocamIcon from '@mui/icons-material/Videocam';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PeopleIcon from '@mui/icons-material/People';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EventIcon from '@mui/icons-material/Event';
import { useAuth } from '../../contexts/AuthContext';
import XPBar from '../gamification/XPBar';
import useSwipeNavigation from '../../hooks/useSwipeNavigation';

// Platform admin emails (sync with backend)
const PLATFORM_ADMIN_EMAILS = [
  'josh@gullstack.com',
  'bryce@gullstack.com',
];

// Four permanent tabs. The bar used to change membership four times over a
// user's lifecycle, which made muscle memory impossible and left most pages
// with no highlighted tab. These never change; each tab owns a family of
// routes (see TAB_ROUTE_FAMILIES) so "you are here" always lights up.
const BOTTOM_NAV_ITEMS = [
  { label: 'Today', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Journey', path: '/course', icon: <SchoolIcon /> },
  { label: 'Us', path: '/matchup', icon: <FavoriteIcon /> },
  { label: 'You', path: '/settings', icon: <SettingsIcon /> },
];

const TAB_ROUTE_FAMILIES = [
  ['/dashboard', '/daily'],
  ['/course', '/assessments', '/strategies', '/skills', '/reports', '/weekly-review', '/transformation'],
  ['/matchup', '/gratitude', '/real-talk', '/meetings'],
  ['/settings', '/subscribe'],
];

// Therapist bottom nav — same "four permanent tabs" philosophy as the client bar.
const THERAPIST_BOTTOM_NAV_ITEMS = [
  { label: 'Dashboard', path: '/therapist', icon: <DashboardIcon /> },
  { label: 'Clients', path: '/therapist/clients', icon: <PeopleIcon /> },
  { label: 'Alerts', path: '/therapist/alerts', icon: <NotificationsIcon /> },
  { label: 'You', path: '/therapist/settings', icon: <SettingsIcon /> },
];

// Index-aligned with THERAPIST_BOTTOM_NAV_ITEMS. NOTE: '/therapist' is a
// prefix of every other therapist route, so the Dashboard tab (index 0) only
// claims it via an exact match in getCurrentNavIndex — never by prefix —
// plus the couple detail pages listed here.
const THERAPIST_TAB_ROUTE_FAMILIES = [
  ['/therapist/couples'],
  ['/therapist/clients'],
  ['/therapist/alerts'],
  ['/therapist/settings', '/therapist/appointments'],
];

// Side drawer grouped items
function getDrawerSections(isPlatformAdmin, userState) {
  // Brand-new users (no assessments yet) shouldn't see a wall of empty,
  // premature destinations — keep their menu focused on getting started.
  const isBlank = userState === 'BLANK';
  const hiddenForBlank = new Set(['/skills', '/matchup', '/reports', '/meetings']);
  const sections = [
    {
      header: 'GROW',
      items: [
        { label: 'Today', path: '/dashboard', icon: <DashboardIcon /> },
        { label: 'Journey', path: '/course', icon: <SchoolIcon /> },
        { label: 'Strategies', path: '/strategies', icon: <TipsAndUpdatesIcon /> },
        { label: 'Skill Tree', path: '/skills', icon: <AccountTreeIcon /> },
      ],
    },
    {
      header: 'DAILY',
      items: [
        { label: 'Check-in', path: '/daily', icon: <EditNoteIcon /> },
        { label: 'Real Talk', path: '/real-talk', icon: <ChatBubbleOutlineIcon /> },
        { label: 'Gratitude', path: '/gratitude', icon: <VolunteerActivismIcon /> },
      ],
    },
    {
      header: 'UNDERSTAND',
      items: [
        { label: 'Assessments', path: '/assessments', icon: <AssignmentIcon /> },
        { label: 'Matchup', path: '/matchup', icon: <FavoriteIcon /> },
        { label: 'Reports', path: '/reports', icon: <AssessmentIcon /> },
        { label: 'Weekly Review', path: '/weekly-review', icon: <AssessmentIcon /> },
        { label: 'Transformation Mirror', path: '/transformation', icon: <TipsAndUpdatesIcon /> },
      ],
    },
    {
      header: 'YOU',
      items: [
        { label: 'Meetings', path: '/meetings', icon: <VideocamIcon /> },
        { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
      ],
    },
  ];

  if (isPlatformAdmin) {
    sections.push({
      header: 'ADMIN',
      items: [
        { label: 'Admin', path: '/admin', icon: <AdminPanelSettingsIcon />, isAdmin: true },
      ],
    });
  }

  if (!isBlank) return sections;
  // Filter premature items + drop any section left empty.
  return sections
    .map((s) => ({ ...s, items: s.items.filter((it) => !hiddenForBlank.has(it.path)) }))
    .filter((s) => s.items.length > 0);
}

// Therapist drawer — their practice, not the client 16-week journey.
function getTherapistDrawerSections(isPlatformAdmin) {
  const sections = [
    {
      header: 'PRACTICE',
      items: [
        // exact: '/therapist' is a prefix of every other therapist route —
        // highlight it only on an exact match.
        { label: 'Dashboard', path: '/therapist', icon: <DashboardIcon />, exact: true },
        { label: 'Clients', path: '/therapist/clients', icon: <PeopleIcon /> },
        { label: 'Appointments', path: '/therapist/appointments', icon: <EventIcon /> },
        { label: 'Alerts', path: '/therapist/alerts', icon: <NotificationsIcon /> },
      ],
    },
    {
      header: 'YOU',
      items: [
        { label: 'Settings', path: '/therapist/settings', icon: <SettingsIcon /> },
      ],
    },
  ];

  if (isPlatformAdmin) {
    sections.push({
      header: 'ADMIN',
      items: [
        { label: 'Admin', path: '/admin', icon: <AdminPanelSettingsIcon />, isAdmin: true },
      ],
    });
  }

  return sections;
}

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, journey, logout } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Swipe navigation for mobile tab switching
  useSwipeNavigation();

  // Check if user is platform admin
  const isPlatformAdmin = user?.isPlatformAdmin ||
    (user?.email && PLATFORM_ADMIN_EMAILS.includes(user.email.toLowerCase()));

  // Therapist-side detection — drives distinct chrome
  const isTherapistMode = location.pathname.startsWith('/therapist');

  // Role-based navigation: therapists get their own drawer + tabs everywhere,
  // regardless of which route they're currently on.
  const isTherapist = user?.role === 'therapist';

  // Journey state is server-owned (computed on /auth/me) — the old
  // localStorage relay from the Dashboard left this permanently stale.
  const userState = journey?.state || 'BLANK';
  const bottomNavItems = isTherapist ? THERAPIST_BOTTOM_NAV_ITEMS : BOTTOM_NAV_ITEMS;
  const drawerSections = isTherapist
    ? getTherapistDrawerSections(isPlatformAdmin)
    : getDrawerSections(isPlatformAdmin, userState);

  const handleNavigation = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getCurrentNavIndex = () => {
    if (isTherapist) {
      // '/therapist' itself only ever matches exactly (Dashboard tab) — as a
      // prefix it would swallow every other therapist route.
      if (location.pathname === '/therapist') return 0;
      const index = THERAPIST_TAB_ROUTE_FAMILIES.findIndex((family) =>
        family.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
      );
      return index >= 0 ? index : -1;
    }
    const index = TAB_ROUTE_FAMILIES.findIndex((family) =>
      family.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
    );
    return index >= 0 ? index : -1;
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || user.email[0]}`.toUpperCase()
    : '?';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          paddingTop: 'env(safe-area-inset-top)',
          bgcolor: isTherapistMode ? '#0d4f5c' : 'background.paper',
          color: isTherapistMode ? '#fff' : 'text.primary',
          borderBottom: isTherapistMode ? 'none' : '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar variant={isMobile ? 'dense' : 'regular'}>
          {isMobile && (
            <IconButton
              edge="start"
              aria-label="Open navigation menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2, color: isTherapistMode ? '#fff' : 'inherit' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box
            component="a"
            href={isTherapistMode ? '/therapist' : '/dashboard'}
            onClick={(e) => { e.preventDefault(); navigate(isTherapistMode ? '/therapist' : '/dashboard'); }}
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', flexGrow: 1, cursor: 'pointer', gap: 1 }}
          >
            <FavoriteIcon sx={{ color: isTherapistMode ? '#7fd6e8' : 'primary.main', flexShrink: 0 }} />
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: { xs: '1.05rem', sm: '1.25rem' } }}
            >
              Love Rescue
            </Typography>
            {isTherapistMode && (
              <Box
                sx={{
                  ml: 1,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: 'rgba(127,214,232,0.25)',
                  border: '1px solid rgba(127,214,232,0.5)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#7fd6e8',
                  flexShrink: 0,
                }}
              >
                Therapist
              </Box>
            )}
          </Box>

          {user && !isTherapistMode && <XPBar />}

          <IconButton aria-label="Account menu" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ bgcolor: isTherapistMode ? '#1a7a8a' : 'primary.main', width: 36, height: 36 }}>
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

      {/* Side Drawer (desktop permanent / mobile temporary) */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{
          keepMounted: false,
        }}
        sx={{
          display: isMobile ? 'block' : { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            mt: { xs: 'calc(48px + env(safe-area-inset-top))', md: '64px' },
            height: { xs: 'calc(100% - 48px - env(safe-area-inset-top))', md: 'calc(100% - 64px)' },
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <List>
          {drawerSections.map((section) => (
            <React.Fragment key={section.header}>
              <ListSubheader
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: 'text.disabled',
                  lineHeight: '32px',
                  mt: 1,
                }}
              >
                {section.header}
              </ListSubheader>
              {section.items.map((item) => (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    selected={item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      ...(item.isAdmin && {
                        bgcolor: 'warning.light',
                        '&:hover': { bgcolor: 'warning.main', color: 'warning.contrastText' },
                      }),
                      '&.Mui-selected': {
                        bgcolor: item.isAdmin ? 'warning.main' : 'primary.light',
                        color: item.isAdmin ? 'warning.contrastText' : 'primary.contrastText',
                        '& .MuiListItemIcon-root': {
                          color: item.isAdmin ? 'warning.contrastText' : 'primary.contrastText',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: item.isAdmin ? 'warning.main' : undefined }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </React.Fragment>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          mt: { xs: 'calc(48px + env(safe-area-inset-top))', md: '64px' },
          // Bottom nav is ~56px tall AND adds pb: env(safe-area-inset-bottom);
          // reserve both so content clears the home indicator on notched iPhones.
          mb: isMobile ? 'calc(56px + env(safe-area-inset-bottom))' : 0,
          ml: isMobile ? 0 : '240px',
          background: isTherapistMode
            ? 'linear-gradient(180deg, #e8f6f8 0%, #f4fafb 30%)'
            : 'linear-gradient(180deg, #fff3f6 0%, #fafafa 30%)',
          backgroundAttachment: 'fixed',
          minHeight: {
            xs: 'calc(100vh - 48px - env(safe-area-inset-top) - 56px - env(safe-area-inset-bottom))',
            md: 'calc(100vh - 64px)',
          },
          overflowX: 'hidden',
        }}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </Box>

      {/* Bottom Navigation (mobile only) */}
      {isMobile && (
        <Paper
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100, pb: 'env(safe-area-inset-bottom)' }}
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
            {bottomNavItems.map((item, index) => (
              <BottomNavigationAction
                key={item.label + index}
                label={item.label}
                icon={item.icon}
                sx={{
                  transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                  '&:active': { transform: 'scale(0.9)' },
                  // active tab: pop the icon + a soft brand pill behind it
                  '&.Mui-selected .MuiSvgIcon-root': {
                    transform: 'scale(1.22) translateY(-1px)',
                    transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                    filter: 'drop-shadow(0 3px 6px rgba(224,138,60,0.45))',
                  },
                  '&.Mui-selected': {
                    '& .MuiBottomNavigationAction-label': { fontWeight: 700 },
                  },
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default Layout;
