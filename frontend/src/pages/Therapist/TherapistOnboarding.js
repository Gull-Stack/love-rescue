import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  MenuItem,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Grid,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PsychologyIcon from '@mui/icons-material/Psychology';
import api from '../../services/api';

const STEPS = ['Role', 'License Info', 'Approach', 'Welcome'];

const LICENSE_TYPES = [
  'LMFT (Licensed Marriage & Family Therapist)',
  'LPC (Licensed Professional Counselor)',
  'LCSW (Licensed Clinical Social Worker)',
  'PsyD (Doctor of Psychology)',
  'PhD (Clinical Psychology)',
  'LPCC (Licensed Professional Clinical Counselor)',
  'Other',
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const APPROACHES = [
  {
    id: 'eft',
    name: 'Emotionally Focused Therapy (EFT)',
    description: 'Focuses on attachment bonds and emotional responses. Helps couples identify negative interaction patterns and build secure emotional connections.',
    icon: '💕',
  },
  {
    id: 'gottman',
    name: 'Gottman Method',
    description: 'Research-based approach focusing on the Sound Relationship House theory. Builds friendship, manages conflict, and creates shared meaning.',
    icon: '🏠',
  },
  {
    id: 'cbt',
    name: 'Cognitive Behavioral Therapy (CBT)',
    description: 'Identifies and restructures unhelpful thought patterns affecting the relationship. Practical, skill-building focus with measurable outcomes.',
    icon: '🧠',
  },
  {
    id: 'psychodynamic',
    name: 'Psychodynamic',
    description: 'Explores how unconscious patterns from early relationships influence current dynamics. Deep insight-oriented work on attachment history.',
    icon: '🔍',
  },
  {
    id: 'integrative',
    name: 'Integrative',
    description: 'Draws from multiple therapeutic modalities tailored to each couple\'s unique needs. Flexible and adaptive approach.',
    icon: '🌈',
  },
];

const TherapistOnboarding = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    licenseType: '',
    licenseState: '',
    licenseNumber: '',
    practiceName: '',
    approach: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormErrors({ ...formErrors, [e.target.name]: '' });
    setError('');
  };

  const validateLicenseStep = () => {
    const errors = {};
    if (!formData.licenseType) errors.licenseType = 'License type is required';
    if (!formData.licenseState) errors.licenseState = 'State is required';
    if (!formData.licenseNumber) errors.licenseNumber = 'License number is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (activeStep === 1 && !validateLicenseStep()) return;
    if (activeStep === 2 && !formData.approach) {
      setError('Please select your therapeutic approach');
      return;
    }

    if (activeStep === 2) {
      // Submit onboarding
      setLoading(true);
      setError('');
      try {
        await api.post('/therapist/onboard', formData);
        setActiveStep(3);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to complete onboarding');
      } finally {
        setLoading(false);
      }
      return;
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError('');
  };

  const renderRoleSelection = () => (
    <Box textAlign="center">
      <LocalHospitalIcon color="primary" sx={{ fontSize: 56, mb: 2 }} />
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Welcome, Therapist
      </Typography>
      <Typography color="text.secondary" paragraph sx={{ maxWidth: 480, mx: 'auto' }}>
        Love Rescue helps you support your clients' relationship growth between sessions.
        Set up your professional profile to get started.
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => setActiveStep(1)}
        sx={{ mt: 2 }}
        startIcon={<PsychologyIcon />}
      >
        I'm a Licensed Therapist
      </Button>
    </Box>
  );

  const renderLicenseInfo = () => (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        License Information
      </Typography>
      <Typography color="text.secondary" paragraph>
        We verify credentials to maintain trust and safety for all users.
      </Typography>

      <TextField
        select
        fullWidth
        label="License Type"
        name="licenseType"
        value={formData.licenseType}
        onChange={handleChange}
        margin="normal"
        required
        error={!!formErrors.licenseType}
        helperText={formErrors.licenseType}
      >
        {LICENSE_TYPES.map((type) => (
          <MenuItem key={type} value={type}>{type}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        fullWidth
        label="Licensed State"
        name="licenseState"
        value={formData.licenseState}
        onChange={handleChange}
        margin="normal"
        required
        error={!!formErrors.licenseState}
        helperText={formErrors.licenseState}
      >
        {US_STATES.map((state) => (
          <MenuItem key={state} value={state}>{state}</MenuItem>
        ))}
      </TextField>

      <TextField
        fullWidth
        label="License Number"
        name="licenseNumber"
        value={formData.licenseNumber}
        onChange={handleChange}
        margin="normal"
        required
        error={!!formErrors.licenseNumber}
        helperText={formErrors.licenseNumber || 'Used for verification only — never shared with clients'}
      />

      <TextField
        fullWidth
        label="Practice Name (optional)"
        name="practiceName"
        value={formData.practiceName}
        onChange={handleChange}
        margin="normal"
        helperText="Displayed to clients when you send an invite"
      />
    </Box>
  );

  const renderApproachSelection = () => (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Therapeutic Approach
      </Typography>
      <Typography color="text.secondary" paragraph>
        Select your primary modality. This helps us tailor assessments and strategies
        to complement your clinical work.
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {APPROACHES.map((approach) => (
          <Grid item xs={12} sm={6} key={approach.id}>
            <Card
              variant="outlined"
              sx={{
                borderColor: formData.approach === approach.id ? 'primary.main' : 'divider',
                borderWidth: formData.approach === approach.id ? 2 : 1,
                transition: 'all 0.2s',
                height: '100%',
              }}
            >
              <CardActionArea
                onClick={() => {
                  setFormData({ ...formData, approach: approach.id });
                  setError('');
                }}
                sx={{ height: '100%', p: 0 }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography fontSize="1.5rem">{approach.icon}</Typography>
                    <Typography variant="h6" fontSize="0.95rem" fontWeight={600}>
                      {approach.name}
                    </Typography>
                    {formData.approach === approach.id && (
                      <CheckCircleIcon color="primary" sx={{ ml: 'auto', fontSize: 20 }} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {approach.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderWelcome = () => (
    <Box textAlign="center">
      <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        You're All Set!
      </Typography>
      <Typography color="text.secondary" paragraph sx={{ maxWidth: 480, mx: 'auto' }}>
        Your therapist profile is ready. Invite clients to connect with you on
        Love Rescue and support their growth between sessions.
      </Typography>
      <Chip
        label={APPROACHES.find((a) => a.id === formData.approach)?.name || formData.approach}
        color="primary"
        variant="outlined"
        sx={{ mb: 3 }}
      />
      <Box display="flex" flexDirection="column" gap={2} alignItems="center" mt={2}>
        <Button
          variant="contained"
          size="large"
          startIcon={<PersonAddIcon />}
          onClick={() => navigate('/therapist/clients')}
        >
          Invite Your First Client
        </Button>
        <Button
          variant="text"
          onClick={() => navigate('/therapist/settings')}
        >
          Go to Therapist Settings
        </Button>
      </Box>
    </Box>
  );

  const stepContent = [renderRoleSelection, renderLicenseInfo, renderApproachSelection, renderWelcome];

  return (
    <Container maxWidth="md">
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, border: '1px solid', borderColor: 'divider' }}>
          {activeStep > 0 && activeStep < 3 && (
            <Stepper activeStep={activeStep - 1} sx={{ mb: 4 }} alternativeLabel>
              {STEPS.slice(1, 3).map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {stepContent[activeStep]()}

          {activeStep > 0 && activeStep < 3 && (
            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button onClick={handleBack} disabled={loading}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : activeStep === 2 ? 'Complete Setup' : 'Continue'}
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default TherapistOnboarding;
