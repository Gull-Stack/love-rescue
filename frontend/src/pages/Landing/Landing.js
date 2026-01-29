import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Avatar,
  Divider,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Icons
import FavoriteIcon from '@mui/icons-material/Favorite';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import InsightsIcon from '@mui/icons-material/Insights';
import PsychologyIcon from '@mui/icons-material/Psychology';
import VideocamIcon from '@mui/icons-material/Videocam';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import GroupsIcon from '@mui/icons-material/Groups';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

// ─── CONSTANTS ───────────────────────────────────────────────
const DARK_BG = '#0d0221';
const DARK_BG_2 = '#1a0a2e';
const DARK_BG_3 = '#140720';
const ACCENT_PINK = '#e91e63';
const ACCENT_PURPLE = '#9c27b0';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)';
const ACCENT_GRADIENT_HOVER = 'linear-gradient(135deg, #f4407a 0%, #b040d0 100%)';

const programs = [
  {
    title: 'Relationship Assessments',
    subtitle: '4 Scientific Assessments',
    description: 'Discover your attachment style, personality dynamics, wellness behaviors, and closeness patterns through research-backed questionnaires.',
    icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
    color: '#e91e63',
    tag: 'Foundation',
  },
  {
    title: 'Daily Insights',
    subtitle: '14-Week Guided Course',
    description: 'Receive personalized daily insights based on your unique assessment profile. 98 days of science-backed relationship wisdom delivered to you.',
    icon: <LightbulbIcon sx={{ fontSize: 40 }} />,
    color: '#ff9800',
    tag: 'Daily Growth',
  },
  {
    title: 'Daily Videos',
    subtitle: 'Curated Expert Content',
    description: 'Watch hand-picked educational videos from leading relationship scientists, therapists, and TED speakers. Track your streak and build consistency.',
    icon: <OndemandVideoIcon sx={{ fontSize: 40 }} />,
    color: '#2196f3',
    tag: 'Education',
  },
  {
    title: 'Matchup Analysis',
    subtitle: 'Compatibility Deep-Dive',
    description: 'See where you and your partner align and where you can grow together. Data-driven insights into your relationship dynamics.',
    icon: <InsightsIcon sx={{ fontSize: 40 }} />,
    color: '#4caf50',
    tag: 'Together',
  },
  {
    title: 'Smart Strategies',
    subtitle: 'Personalized Action Plans',
    description: 'Weekly and cycle-based strategy plans tailored to your relationship profile. Actionable goals with progress tracking built in.',
    icon: <PsychologyIcon sx={{ fontSize: 40 }} />,
    color: '#9c27b0',
    tag: 'Action',
  },
  {
    title: 'Mediated Meetings',
    subtitle: 'Guided Video Sessions',
    description: 'Schedule weekly 30-minute facilitated discussions with neutral guides via Google Meet. Structured conversations, not therapy.',
    icon: <VideocamIcon sx={{ fontSize: 40 }} />,
    color: '#00bcd4',
    tag: 'Premium',
  },
];

const steps = [
  {
    number: '01',
    title: 'Take Your Assessments',
    description: 'Complete four research-backed assessments to reveal your attachment style, personality dynamics, wellness behaviors, and closeness patterns.',
  },
  {
    number: '02',
    title: 'Invite Your Partner',
    description: 'Share a simple invite link. When both partners complete assessments, the full power of Marriage Rescue unlocks — matchup scores, shared strategies, and more.',
  },
  {
    number: '03',
    title: 'Grow Every Day',
    description: 'Log daily interactions, watch curated videos, receive personalized insights, and track your 5:1 positivity ratio. Small daily actions compound into lasting change.',
  },
  {
    number: '04',
    title: 'See Real Progress',
    description: 'Weekly and monthly reports show your trajectory. Relationship science meets daily practice — watch your connection strengthen over 14 weeks and beyond.',
  },
];

const testimonials = [
  {
    name: 'Sarah & James',
    location: 'Portland, OR',
    text: "After 12 years together, we'd lost our way. The daily insights and matchup analysis helped us see patterns we were blind to. Our ratio went from 2:1 to over 6:1 in two months.",
    rating: 5,
    avatar: 'SJ',
  },
  {
    name: 'Priya & Arun',
    location: 'Austin, TX',
    text: "The mediated meetings were a game-changer. Having a neutral guide helped us have conversations we'd been avoiding for years. We actually look forward to our weekly sessions now.",
    rating: 5,
    avatar: 'PA',
  },
  {
    name: 'Michael & David',
    location: 'Chicago, IL',
    text: "The assessment revealed I have an anxious attachment style and my partner is avoidant. Just understanding that transformed how we communicate. The personalized insights are spot-on.",
    rating: 5,
    avatar: 'MD',
  },
  {
    name: 'Emily & Carlos',
    location: 'Miami, FL',
    text: "We were skeptical about an app helping our marriage, but the science-backed approach won us over. The daily videos from actual relationship researchers are incredible.",
    rating: 5,
    avatar: 'EC',
  },
];

const stats = [
  { value: '94%', label: 'of couples report improved communication within 4 weeks' },
  { value: '5:1', label: 'average positivity ratio achieved by active users' },
  { value: '14', label: 'weeks of structured, science-backed content' },
  { value: '10K+', label: 'couples building stronger relationships' },
];

const navLinks = [
  { label: 'Programs', href: '#programs' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Results', href: '#results' },
  { label: 'Pricing', href: '#pricing' },
];

// ─── LANDING PAGE ────────────────────────────────────────────
const Landing = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Header ──
  const Header = (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        transition: 'all 0.3s ease',
        bgcolor: scrolled ? 'rgba(13, 2, 33, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: scrolled ? 1.5 : 2.5,
            transition: 'padding 0.3s ease',
          }}
        >
          {/* Logo */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <FavoriteIcon sx={{ color: ACCENT_PINK, fontSize: 32 }} />
            <Typography
              variant="h6"
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                letterSpacing: '-0.02em',
              }}
            >
              Marriage Rescue
            </Typography>
          </Box>

          {/* Desktop Nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {navLinks.map((link) => (
                <Typography
                  key={link.label}
                  component="a"
                  onClick={() => scrollTo(link.href)}
                  sx={{
                    color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    '&:hover': { color: '#fff' },
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
          )}

          {/* CTA Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!isMobile && (
              <Button
                onClick={() => navigate('/login')}
                sx={{
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 500,
                  '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                Log In
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => navigate('/signup')}
              sx={{
                background: ACCENT_GRADIENT,
                fontWeight: 600,
                px: 3,
                fontSize: '0.9rem',
                '&:hover': { background: ACCENT_GRADIENT_HOVER },
              }}
            >
              {isSmall ? 'Start Free' : 'Start Free Trial'}
            </Button>
            {isMobile && (
              <IconButton onClick={() => setMobileMenuOpen(true)} sx={{ color: '#fff' }}>
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: DARK_BG,
            width: 280,
            pt: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2 }}>
          <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {navLinks.map((link) => (
            <ListItem key={link.label} button onClick={() => scrollTo(link.href)}>
              <ListItemText
                primary={link.label}
                sx={{ '& .MuiTypography-root': { color: '#fff', fontWeight: 500 } }}
              />
            </ListItem>
          ))}
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />
          <ListItem button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
            <ListItemText
              primary="Log In"
              sx={{ '& .MuiTypography-root': { color: 'rgba(255,255,255,0.8)' } }}
            />
          </ListItem>
          <ListItem>
            <Button
              fullWidth
              variant="contained"
              onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
              sx={{ background: ACCENT_GRADIENT, fontWeight: 600 }}
            >
              Start Free Trial
            </Button>
          </ListItem>
        </List>
      </Drawer>
    </Box>
  );

  // ── Hero ──
  const Hero = (
    <Box
      ref={heroRef}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(233,30,99,0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(156,39,176,0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 80%, rgba(233,30,99,0.08) 0%, transparent 50%),
          linear-gradient(180deg, ${DARK_BG} 0%, ${DARK_BG_2} 50%, ${DARK_BG_3} 100%)
        `,
      }}
    >
      {/* Animated background particles (CSS only) */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(233,30,99,0.06) 0%, transparent 70%)',
            top: '-10%',
            right: '-10%',
            animation: 'float 20s ease-in-out infinite',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(156,39,176,0.06) 0%, transparent 70%)',
            bottom: '-5%',
            left: '-5%',
            animation: 'float 15s ease-in-out infinite reverse',
          },
          '@keyframes float': {
            '0%, 100%': { transform: 'translate(0, 0)' },
            '50%': { transform: 'translate(30px, -30px)' },
          },
        }}
      />

      {/* Hero image overlay (replace with actual image) */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/images/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15,
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, ${DARK_BG} 0%, transparent 30%, transparent 70%, ${DARK_BG_2} 100%)`,
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center', py: 8 }}>
        {/* Eyebrow badge */}
        <Chip
          label="SCIENCE-BACKED RELATIONSHIP TRANSFORMATION"
          sx={{
            mb: 4,
            bgcolor: 'rgba(233,30,99,0.15)',
            color: ACCENT_PINK,
            fontWeight: 600,
            fontSize: { xs: '0.65rem', md: '0.75rem' },
            letterSpacing: '0.1em',
            border: '1px solid rgba(233,30,99,0.3)',
            px: 2,
            py: 2.5,
          }}
        />

        {/* Main headline */}
        <Typography
          variant="h1"
          sx={{
            color: '#fff',
            fontWeight: 800,
            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem', lg: '5.5rem' },
            lineHeight: 1.05,
            mb: 3,
            letterSpacing: '-0.03em',
            maxWidth: '900px',
            mx: 'auto',
          }}
        >
          Welcome Back{' '}
          <Box
            component="span"
            sx={{
              background: ACCENT_GRADIENT,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Marriage Rescue
          </Box>
        </Typography>

        {/* Subheadline */}
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: { xs: '1.05rem', md: '1.35rem' },
            maxWidth: '680px',
            mx: 'auto',
            mb: 5,
            lineHeight: 1.6,
            fontWeight: 300,
          }}
        >
          The only relationship platform that combines clinical assessments, daily micro-coaching,
          and guided facilitated meetings to help couples build lasting connection.
          Start your 14-day free trial today.
        </Typography>

        {/* CTA buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 6 }}>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/signup')}
            sx={{
              background: ACCENT_GRADIENT,
              fontSize: { xs: '1rem', md: '1.15rem' },
              fontWeight: 700,
              px: { xs: 4, md: 5 },
              py: 1.8,
              borderRadius: '50px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 4px 30px rgba(233,30,99,0.4)',
              '&:hover': {
                background: ACCENT_GRADIENT_HOVER,
                boxShadow: '0 6px 40px rgba(233,30,99,0.5)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Yes! Start My Free Trial
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<PlayCircleFilledIcon />}
            onClick={() => scrollTo('#programs')}
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: '#fff',
              fontSize: { xs: '0.95rem', md: '1.05rem' },
              fontWeight: 500,
              px: { xs: 3, md: 4 },
              py: 1.8,
              borderRadius: '50px',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.6)',
                bgcolor: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            See How It Works
          </Button>
        </Box>

        {/* Trust indicators */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: { xs: 3, md: 5 },
            flexWrap: 'wrap',
            opacity: 0.6,
          }}
        >
          {['Based on Gottman Research', 'HIPAA Compliant', '14-Day Free Trial', 'Cancel Anytime'].map(
            (item) => (
              <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 16 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 500 }}>
                  {item}
                </Typography>
              </Box>
            )
          )}
        </Box>

        {/* Scroll indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'bounce 2s infinite',
            '@keyframes bounce': {
              '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
              '50%': { transform: 'translateX(-50%) translateY(10px)' },
            },
          }}
        >
          <KeyboardArrowDownIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 36 }} />
        </Box>
      </Container>
    </Box>
  );

  // ── Stats Bar ──
  const StatsBar = (
    <Box sx={{ bgcolor: DARK_BG_3, py: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="center">
          {stats.map((stat) => (
            <Grid item xs={6} md={3} key={stat.label}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontSize: { xs: '2.2rem', md: '3rem' },
                    fontWeight: 800,
                    background: ACCENT_GRADIENT,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1,
                    mb: 1,
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  sx={{ color: 'rgba(255,255,255,0.5)', fontSize: { xs: '0.8rem', md: '0.9rem' }, fontWeight: 400 }}
                >
                  {stat.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );

  // ── Programs Section ──
  const ProgramsSection = (
    <Box
      id="programs"
      sx={{
        py: { xs: 8, md: 12 },
        background: `linear-gradient(180deg, ${DARK_BG_3} 0%, ${DARK_BG} 100%)`,
      }}
    >
      <Container maxWidth="lg">
        {/* Section header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Chip
            label="PROGRAMS"
            sx={{
              mb: 2,
              bgcolor: 'rgba(156,39,176,0.15)',
              color: ACCENT_PURPLE,
              fontWeight: 600,
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              border: '1px solid rgba(156,39,176,0.3)',
            }}
          />
          <Typography
            variant="h2"
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3rem' },
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Everything You Need to{' '}
            <Box
              component="span"
              sx={{
                background: ACCENT_GRADIENT,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Transform Your Relationship
            </Box>
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: { xs: '1rem', md: '1.15rem' },
              maxWidth: '600px',
              mx: 'auto',
              fontWeight: 300,
            }}
          >
            Six integrated tools designed by relationship scientists, delivered through a platform
            that fits into your daily life.
          </Typography>
        </Box>

        {/* Program cards */}
        <Grid container spacing={3}>
          {programs.map((program) => (
            <Grid item xs={12} sm={6} md={4} key={program.title}>
              <Card
                sx={{
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 4,
                  height: '100%',
                  transition: 'all 0.4s ease',
                  cursor: 'pointer',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    border: `1px solid ${program.color}40`,
                    boxShadow: `0 20px 60px ${program.color}15`,
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  {/* Color accent bar */}
                  <Box
                    sx={{
                      width: 50,
                      height: 4,
                      borderRadius: 2,
                      bgcolor: program.color,
                      mb: 3,
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ color: program.color }}>{program.icon}</Box>
                    <Chip
                      label={program.tag}
                      size="small"
                      sx={{
                        bgcolor: `${program.color}15`,
                        color: program.color,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{ color: '#fff', fontWeight: 700, mb: 0.5, fontSize: '1.2rem' }}
                  >
                    {program.title}
                  </Typography>
                  <Typography
                    sx={{ color: program.color, fontSize: '0.85rem', fontWeight: 500, mb: 2 }}
                  >
                    {program.subtitle}
                  </Typography>
                  <Typography
                    sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.6 }}
                  >
                    {program.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );

  // ── How It Works ──
  const HowItWorks = (
    <Box
      id="how-it-works"
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: DARK_BG_2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background accent */}
      <Box
        sx={{
          position: 'absolute',
          right: '-200px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(233,30,99,0.04) 0%, transparent 70%)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Chip
            label="HOW IT WORKS"
            sx={{
              mb: 2,
              bgcolor: 'rgba(233,30,99,0.15)',
              color: ACCENT_PINK,
              fontWeight: 600,
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              border: '1px solid rgba(233,30,99,0.3)',
            }}
          />
          <Typography
            variant="h2"
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3rem' },
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Your Journey to a{' '}
            <Box
              component="span"
              sx={{
                background: ACCENT_GRADIENT,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Stronger Marriage
            </Box>
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {steps.map((step, index) => (
            <Grid item xs={12} sm={6} md={3} key={step.number}>
              <Box sx={{ position: 'relative' }}>
                {/* Connector line (desktop only) */}
                {index < steps.length - 1 && !isMobile && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 35,
                      right: -40,
                      width: 80,
                      height: 2,
                      background: 'linear-gradient(90deg, rgba(233,30,99,0.3), rgba(156,39,176,0.3))',
                      display: { xs: 'none', md: 'block' },
                    }}
                  />
                )}
                <Typography
                  sx={{
                    fontSize: '3.5rem',
                    fontWeight: 900,
                    background: ACCENT_GRADIENT,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    opacity: 0.4,
                    lineHeight: 1,
                    mb: 2,
                  }}
                >
                  {step.number}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ color: '#fff', fontWeight: 700, mb: 1.5, fontSize: '1.15rem' }}
                >
                  {step.title}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {step.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );

  // ── Video Spotlight ──
  const VideoSpotlight = (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        background: `linear-gradient(180deg, ${DARK_BG_2} 0%, ${DARK_BG} 100%)`,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Chip
              label="FEATURED"
              sx={{
                mb: 2,
                bgcolor: 'rgba(233,30,99,0.15)',
                color: ACCENT_PINK,
                fontWeight: 600,
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                border: '1px solid rgba(233,30,99,0.3)',
              }}
            />
            <Typography
              variant="h2"
              sx={{
                color: '#fff',
                fontWeight: 800,
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                letterSpacing: '-0.02em',
                mb: 3,
              }}
            >
              Built on Decades of{' '}
              <Box
                component="span"
                sx={{
                  background: ACCENT_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Relationship Science
              </Box>
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1.05rem',
                lineHeight: 1.8,
                mb: 4,
              }}
            >
              Marriage Rescue is grounded in the research of Dr. John Gottman, Dr. Sue Johnson,
              and leading attachment theorists. Our assessments, insights, and strategies are
              drawn from peer-reviewed studies on what actually makes relationships thrive.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { icon: <SecurityIcon />, text: 'HIPAA-compliant data security and audit logging' },
                { icon: <GroupsIcon />, text: 'Designed for both partners with shared progress tracking' },
                { icon: <AutoAwesomeIcon />, text: 'Personalized insights based on your unique assessment profile' },
              ].map((item) => (
                <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: ACCENT_PINK }}>{item.icon}</Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                    {item.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            {/* Video embed */}
            <Box
              sx={{
                position: 'relative',
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '56.25%',
                  height: 0,
                  bgcolor: '#000',
                }}
              >
                <iframe
                  src="https://www.youtube.com/embed/ioR7GKRSOS0"
                  title="Making Marriage Work - Dr. John Gottman"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 0,
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  // ── Testimonials ──
  const TestimonialsSection = (
    <Box
      id="results"
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: DARK_BG_3,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Chip
            label="RESULTS"
            sx={{
              mb: 2,
              bgcolor: 'rgba(76,175,80,0.15)',
              color: '#4caf50',
              fontWeight: 600,
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              border: '1px solid rgba(76,175,80,0.3)',
            }}
          />
          <Typography
            variant="h2"
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3rem' },
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Real Couples.{' '}
            <Box
              component="span"
              sx={{
                background: ACCENT_GRADIENT,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Real Results.
            </Box>
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {testimonials.map((t) => (
            <Grid item xs={12} sm={6} md={3} key={t.name}>
              <Card
                sx={{
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 4,
                  height: '100%',
                  transition: 'all 0.3s',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <FormatQuoteIcon
                    sx={{ color: ACCENT_PINK, fontSize: 32, opacity: 0.5, mb: 1 }}
                  />
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: '0.9rem',
                      lineHeight: 1.7,
                      mb: 3,
                      fontStyle: 'italic',
                    }}
                  >
                    "{t.text}"
                  </Typography>
                  <Box sx={{ display: 'flex', mb: 1 }}>
                    {[...Array(t.rating)].map((_, i) => (
                      <StarIcon key={i} sx={{ color: '#ff9800', fontSize: 18 }} />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        background: ACCENT_GRADIENT,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      {t.avatar}
                    </Avatar>
                    <Box>
                      <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                        {t.name}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                        {t.location}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );

  // ── Pricing ──
  const PricingSection = (
    <Box
      id="pricing"
      sx={{
        py: { xs: 8, md: 12 },
        background: `linear-gradient(180deg, ${DARK_BG_3} 0%, ${DARK_BG} 100%)`,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Chip
            label="PRICING"
            sx={{
              mb: 2,
              bgcolor: 'rgba(233,30,99,0.15)',
              color: ACCENT_PINK,
              fontWeight: 600,
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              border: '1px solid rgba(233,30,99,0.3)',
            }}
          />
          <Typography
            variant="h2"
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3rem' },
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Invest in Your{' '}
            <Box
              component="span"
              sx={{
                background: ACCENT_GRADIENT,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Most Important Relationship
            </Box>
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '1.05rem',
              maxWidth: '500px',
              mx: 'auto',
              fontWeight: 300,
            }}
          >
            Start with a 14-day free trial. No credit card required.
          </Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {/* Standard */}
          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4,
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.85rem', mb: 1, letterSpacing: '0.1em' }}>
                  STANDARD
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                  <Typography sx={{ color: '#fff', fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>
                    $9.99
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', ml: 1, fontSize: '1rem' }}>
                    /month
                  </Typography>
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', mb: 3 }}>
                  per couple
                </Typography>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />
                {[
                  '4 Scientific Assessments',
                  'Daily Personalized Insights',
                  'Curated Video Course (98 days)',
                  'Matchup Compatibility Analysis',
                  'Smart Strategy Plans',
                  'Weekly & Monthly Reports',
                  'Daily Interaction Logging',
                  'Therapist Integration',
                ].map((feature) => (
                  <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 18 }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                      {feature}
                    </Typography>
                  </Box>
                ))}
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/signup')}
                  sx={{
                    mt: 3,
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: '50px',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.4)',
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Premium */}
          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, rgba(233,30,99,0.08) 0%, rgba(156,39,176,0.08) 100%)',
                border: '1px solid rgba(233,30,99,0.3)',
                borderRadius: 4,
                height: '100%',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              {/* Popular badge */}
              <Chip
                label="MOST POPULAR"
                sx={{
                  position: 'absolute',
                  top: -14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: ACCENT_GRADIENT,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                }}
              />
              <CardContent sx={{ p: 4 }}>
                <Typography
                  sx={{
                    background: ACCENT_GRADIENT,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    mb: 1,
                    letterSpacing: '0.1em',
                  }}
                >
                  PREMIUM
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                  <Typography sx={{ color: '#fff', fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>
                    $19.99
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', ml: 1, fontSize: '1rem' }}>
                    /month
                  </Typography>
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', mb: 3 }}>
                  per couple
                </Typography>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }} />
                {[
                  'Everything in Standard',
                  'Weekly Mediated Meetings',
                  'Neutral Facilitator (included)',
                  'Google Meet Video Sessions',
                  'Partner Consent Management',
                  'Calendar Integration',
                  'Session Notes & History',
                  'Priority Support',
                ].map((feature, i) => (
                  <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <CheckCircleIcon sx={{ color: ACCENT_PINK, fontSize: 18 }} />
                    <Typography
                      sx={{
                        color: i === 0 ? '#fff' : 'rgba(255,255,255,0.7)',
                        fontSize: '0.9rem',
                        fontWeight: i === 0 ? 600 : 400,
                      }}
                    >
                      {feature}
                    </Typography>
                  </Box>
                ))}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/signup')}
                  sx={{
                    mt: 3,
                    background: ACCENT_GRADIENT,
                    py: 1.5,
                    fontWeight: 700,
                    borderRadius: '50px',
                    boxShadow: '0 4px 20px rgba(233,30,99,0.3)',
                    '&:hover': {
                      background: ACCENT_GRADIENT_HOVER,
                      boxShadow: '0 6px 30px rgba(233,30,99,0.4)',
                    },
                  }}
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  // ── Final CTA Banner ──
  const FinalCTA = (
    <Box
      sx={{
        py: { xs: 8, md: 10 },
        background: `
          radial-gradient(ellipse at 50% 50%, rgba(233,30,99,0.15) 0%, transparent 60%),
          ${DARK_BG_2}
        `,
        textAlign: 'center',
      }}
    >
      <Container maxWidth="md">
        <Typography
          variant="h2"
          sx={{
            color: '#fff',
            fontWeight: 800,
            fontSize: { xs: '2rem', md: '3rem' },
            letterSpacing: '-0.02em',
            mb: 2,
          }}
        >
          Your Relationship Deserves{' '}
          <Box
            component="span"
            sx={{
              background: ACCENT_GRADIENT,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            This Investment
          </Box>
        </Typography>
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: { xs: '1rem', md: '1.2rem' },
            maxWidth: '550px',
            mx: 'auto',
            mb: 5,
            fontWeight: 300,
            lineHeight: 1.7,
          }}
        >
          Join thousands of couples who are building stronger, healthier relationships
          with daily practice and science-backed guidance.
        </Typography>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/signup')}
          sx={{
            background: ACCENT_GRADIENT,
            fontSize: { xs: '1.05rem', md: '1.2rem' },
            fontWeight: 700,
            px: { xs: 5, md: 6 },
            py: 2,
            borderRadius: '50px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: '0 4px 30px rgba(233,30,99,0.4)',
            '&:hover': {
              background: ACCENT_GRADIENT_HOVER,
              boxShadow: '0 6px 40px rgba(233,30,99,0.5)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          Start Your Free 14-Day Trial
        </Button>
        <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', mt: 2 }}>
          No credit card required. Cancel anytime.
        </Typography>
      </Container>
    </Box>
  );

  // ── Footer ──
  const Footer = (
    <Box
      component="footer"
      sx={{
        bgcolor: DARK_BG,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        pt: { xs: 6, md: 8 },
        pb: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand column */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FavoriteIcon sx={{ color: ACCENT_PINK, fontSize: 28 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>
                Marriage Rescue
              </Typography>
            </Box>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                maxWidth: 320,
                mb: 3,
              }}
            >
              Science-backed relationship tools designed to help couples build lasting
              connection through daily practice, expert insights, and guided support.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[
                { icon: <FacebookIcon />, label: 'Facebook' },
                { icon: <InstagramIcon />, label: 'Instagram' },
                { icon: <YouTubeIcon />, label: 'YouTube' },
                { icon: <LinkedInIcon />, label: 'LinkedIn' },
              ].map((social) => (
                <IconButton
                  key={social.label}
                  aria-label={social.label}
                  sx={{
                    color: 'rgba(255,255,255,0.3)',
                    '&:hover': { color: ACCENT_PINK, bgcolor: 'rgba(233,30,99,0.08)' },
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Grid>

          {/* Platform links */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', mb: 2, letterSpacing: '0.05em' }}>
              PLATFORM
            </Typography>
            {['Assessments', 'Daily Insights', 'Daily Videos', 'Matchup', 'Strategies', 'Meetings'].map(
              (link) => (
                <Typography
                  key={link}
                  sx={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.85rem',
                    mb: 1,
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    '&:hover': { color: 'rgba(255,255,255,0.7)' },
                  }}
                >
                  {link}
                </Typography>
              )
            )}
          </Grid>

          {/* Company links */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', mb: 2, letterSpacing: '0.05em' }}>
              COMPANY
            </Typography>
            {['About Us', 'Our Research', 'Blog', 'Careers', 'Press'].map((link) => (
              <Typography
                key={link}
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.85rem',
                  mb: 1,
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: 'rgba(255,255,255,0.7)' },
                }}
              >
                {link}
              </Typography>
            ))}
          </Grid>

          {/* Support links */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', mb: 2, letterSpacing: '0.05em' }}>
              SUPPORT
            </Typography>
            {['Help Center', 'Contact Us', 'FAQs', 'Community'].map((link) => (
              <Typography
                key={link}
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.85rem',
                  mb: 1,
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: 'rgba(255,255,255,0.7)' },
                }}
              >
                {link}
              </Typography>
            ))}
          </Grid>

          {/* Legal links */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', mb: 2, letterSpacing: '0.05em' }}>
              LEGAL
            </Typography>
            {['Privacy Policy', 'Terms of Service', 'HIPAA Notice', 'Cookie Policy'].map((link) => (
              <Typography
                key={link}
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.85rem',
                  mb: 1,
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: 'rgba(255,255,255,0.7)' },
                }}
              >
                {link}
              </Typography>
            ))}
          </Grid>
        </Grid>

        {/* Bottom bar */}
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mt: 6, mb: 3 }} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
            {new Date().getFullYear()} Marriage Rescue. All rights reserved.
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: '0.75rem',
              fontStyle: 'italic',
            }}
          >
            Not a substitute for professional therapy or counseling.
          </Typography>
        </Box>
      </Container>
    </Box>
  );

  // ── Page Render ──
  return (
    <Box sx={{ bgcolor: DARK_BG, overflow: 'hidden' }}>
      {Header}
      {Hero}
      {StatsBar}
      {ProgramsSection}
      {HowItWorks}
      {VideoSpotlight}
      {TestimonialsSection}
      {PricingSection}
      {FinalCTA}
      {Footer}
    </Box>
  );
};

export default Landing;
