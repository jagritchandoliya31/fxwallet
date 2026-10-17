import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { profileApi } from './src/api/profileApi';

import Dashboard from './src/pages/Dashboard';
import Market from './src/pages/Market';
import Portfolio from './src/pages/Portfolio';
import Transactions from './src/pages/Transactions';
import Alerts from './src/pages/Alerts';
import Advisor from './src/pages/Advisor';
import PremiumAdvisor from './src/pages/PremiumAdvisor';
import Premium from './src/pages/Premium';
import Support from './src/pages/Support';

function RefreshBrand() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      title="Refresh FXWallet"
      style={{
        display: 'block',
        width: '100%',
        background: 'none',
        border: 'none',
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        className="brand"
        style={{
          cursor: 'pointer',
        }}
      >
        <span>FX</span>Wallet
      </div>

      <p
        className="sim-label"
        style={{
          cursor: 'pointer',
        }}
      >
        VIRTUAL TRADING SIMULATOR
      </p>
    </button>
  );
}

function LoginForm({ mode }) {
  const { login, register, error, setError, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const isRegister = mode === 'register';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch {
      // Error handled in AuthContext
    }
  };

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: '22px',
          alignItems: 'stretch',
        }}
      >
        {/* LEFT - PRODUCT STORY */}
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '24px',
            minHeight: '560px',
            padding: '42px',
            background:
              'linear-gradient(145deg, #0b1220 0%, #111c3b 55%, #173579 100%)',
            color: '#ffffff',
            boxShadow:
              '0 24px 60px rgba(15, 23, 42, 0.18)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background:
                'rgba(56,189,248,0.10)',
              right: '-100px',
              top: '-80px',
            }}
          />

          <div
            style={{
              position: 'absolute',
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              border:
                '1px solid rgba(255,255,255,0.08)',
              right: '-80px',
              bottom: '-90px',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '999px',
                background:
                  'rgba(56,189,248,0.10)',
                border:
                  '1px solid rgba(56,189,248,0.15)',
                color: '#7dd3fc',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              ◈ FXWALLET
            </div>

            <h1
              style={{
                margin: '30px 0 14px',
                fontSize: '48px',
                lineHeight: 1.02,
                letterSpacing: '-0.04em',
                fontWeight: 800,
              }}
            >
              {isRegister
                ? 'Start your currency journey.'
                : 'Welcome back to FXWallet.'}
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: '470px',
                color: '#cbd5e1',
                fontSize: '16px',
                lineHeight: 1.7,
              }}
            >
              A virtual multi-currency workspace to track rates,
              simulate BUY / SELL, manage holdings and understand
              portfolio performance.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '34px',
              }}
            >
              {[
                ['13', 'Currencies'],
                ['₹', 'Virtual INR'],
                ['BUY', 'Simulation'],
                ['AI', 'Intelligence'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  style={{
                    padding: '16px',
                    borderRadius: '15px',
                    background:
                      'rgba(255,255,255,0.05)',
                    border:
                      '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#ffffff',
                    }}
                  >
                    {value}
                  </div>

                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '10px',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: '34px',
                paddingTop: '22px',
                borderTop:
                  '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#f8fafc',
                }}
              >
                SEE → SIMULATE → MEASURE → LEARN
              </div>

              <div
                style={{
                  marginTop: '7px',
                  fontSize: '10px',
                  color: '#64748b',
                }}
              >
                Virtual simulation only — no real currency or payments.
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT - AUTH FORM */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '38px',
            boxShadow:
              '0 18px 50px rgba(15,23,42,0.07)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#2563eb',
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
            >
              {isRegister
                ? 'Create account'
                : 'Secure access'}
            </div>

            <h2
              style={{
                margin: '10px 0 8px',
                fontSize: '30px',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#0f172a',
              }}
            >
              {isRegister
                ? 'Create your FXWallet'
                : 'Sign in to your wallet'}
            </h2>

            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: '13px',
                lineHeight: 1.6,
              }}
            >
              {isRegister
                ? 'Create your virtual trading account and start exploring currencies.'
                : 'Continue your virtual currency simulation and portfolio journey.'}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: '28px',
            }}
          >
            {isRegister && (
              <label
                style={{
                  display: 'block',
                  marginBottom: '17px',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  Name
                </span>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '48px',
                    padding: '0 14px',
                    borderRadius: '12px',
                    border: '1px solid #dbe3ee',
                    background: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </label>
            )}

            <label
              style={{
                display: 'block',
                marginBottom: '17px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: '48px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  border: '1px solid #dbe3ee',
                  background: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </label>

            <label
              style={{
                display: 'block',
                marginBottom: '17px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                Password
              </span>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: '48px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  border: '1px solid #dbe3ee',
                  background: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </label>

            {error && (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#be123c',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '50px',
                border: 'none',
                borderRadius: '13px',
                background:
                  'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow:
                  '0 10px 22px rgba(37,99,235,0.20)',
              }}
            >
              {loading
                ? 'Please wait...'
                : isRegister
                  ? 'Create FXWallet Account'
                  : 'Sign In'}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: '24px 0',
              }}
            >
              <span
                style={{
                  flex: 1,
                  height: '1px',
                  background: '#e2e8f0',
                }}
              />

              <span
                style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                FXWallet
              </span>

              <span
                style={{
                  flex: 1,
                  height: '1px',
                  background: '#e2e8f0',
                }}
              />
            </div>

            <p
              style={{
                margin: 0,
                textAlign: 'center',
                color: '#64748b',
                fontSize: '12px',
              }}
            >
              {isRegister
                ? 'Already have an account?'
                : "Don't have an account?"}{' '}

              <Link
                to={isRegister ? '/login' : '/register'}
                style={{
                  color: '#2563eb',
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                {isRegister
                  ? 'Sign in'
                  : 'Create one'}
              </Link>
            </p>
          </form>

          <div
            style={{
              marginTop: '25px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e8eef5',
              color: '#64748b',
              fontSize: '10px',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            Virtual-money simulation only.
            <br />
            No real currency or payments.
          </div>
        </section>
      </div>
    </div>
  );
}
function Profile() {
  const { logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNo, setPhoneNo] = useState('');

  const [editing, setEditing] = useState(false);

  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await profileApi.getProfile();

      setProfile(data);
      setName(data.name || '');
      setUsername(data.username || '');
      setPhoneNo(data.phoneNo || '');

      if (data.profileImageUrl) {
        const imageBlob = await profileApi.getProfileImage();
        const imageUrl = URL.createObjectURL(imageBlob);
        setImagePreview(imageUrl);
      } else {
        setImagePreview(null);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Please select a JPG or PNG image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile image must be smaller than 5 MB');
      return;
    }

    setProfileImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      const updatedProfile = await profileApi.updateProfile(
        name,
        username,
        phoneNo
      );

      setProfile(updatedProfile);

      if (profileImage) {
        await profileApi.uploadProfileImage(profileImage);
        setProfileImage(null);
      }

      setMessage('Profile updated successfully');
      setEditing(false);

      await loadProfile();
    } catch (err) {
      console.error(err);
      setError('Unable to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);

    setName(profile?.name || '');
    setUsername(profile?.username || '');
    setPhoneNo(profile?.phoneNo || '');

    setProfileImage(null);
    setError('');
    setMessage('');

    if (profile?.profileImageUrl) {
      profileApi
        .getProfileImage()
        .then((blob) => {
          setImagePreview(URL.createObjectURL(blob));
        })
        .catch(() => {
          setImagePreview(null);
        });
    } else {
      setImagePreview(null);
    }
  };

  if (loading) {
    return (
      <div>
        <header>
          <div>
            <p className="eyebrow">ACCOUNT</p>
            <h1>My Profile</h1>
          </div>
        </header>

        <section className="panel">
          <p>Loading profile...</p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <header>
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h1>My Profile</h1>
        </div>
      </header>

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">PROFILE</p>
            <h2>Account information</h2>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setMessage('');
                setError('');
              }}
            >
              Edit Profile
            </button>
          )}
        </div>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

        {error && (
          <p className="message error">
            {error}
          </p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            gap: '35px',
            marginTop: '30px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                fontSize: '52px',
                fontWeight: '700',
              }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                (profile?.name?.charAt(0) || 'U').toUpperCase()
              )}
            </div>

            {editing && (
              <>
                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />

                <label
                  htmlFor="profile-image-input"
                  style={{
                    cursor: 'pointer',
                    padding: '9px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontWeight: '600',
                  }}
                >
                  Change Photo
                </label>
              </>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '22px',
            }}
          >
            <div>
              <p className="eyebrow">NAME</p>

              {editing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              ) : (
                <p>
                  <strong>
                    {profile?.name || 'N/A'}
                  </strong>
                </p>
              )}
            </div>

            <div>
              <p className="eyebrow">USERNAME</p>

              {editing ? (
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              ) : (
                <p>
                  <strong>
                    {profile?.username || 'Not set'}
                  </strong>
                </p>
              )}
            </div>

            <div>
              <p className="eyebrow">EMAIL</p>

              <p>
                <strong>
                  {profile?.email || 'N/A'}
                </strong>
              </p>
            </div>

            <div>
              <p className="eyebrow">PHONE NO</p>

              {editing ? (
                <input
                  type="text"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  placeholder="Enter phone number"
                />
              ) : (
                <p>
                  <strong>
                    {profile?.phoneNo || 'Not set'}
                  </strong>
                </p>
              )}
            </div>

            <div>
              <p className="eyebrow">BALANCE</p>

              <p>
                <strong>
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: profile?.currency || 'INR',
                    maximumFractionDigits: 2,
                  }).format(profile?.balance || 0)}
                </strong>
              </p>
            </div>

            <div>
              <p className="eyebrow">USER TYPE</p>

              <span
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontWeight: '700',
                }}
              >
                {profile?.userType || 'NORMAL'}
              </span>
            </div>
          </div>
        </div>

        {editing && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '35px',
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '30px',
          }}
        >
          <button
            type="button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </section>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    return location.pathname === path;
  };

  const NavItem = ({ to, icon, label, badge }) => {
    const active = isActive(to);

    return (
      <Link
        to={to}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          minHeight: 44,
          padding: '0 12px',
          margin: '3px 0',
          borderRadius: 12,
          textDecoration: 'none',
          color: active ? '#ffffff' : '#94a3b8',
          background: active
            ? 'linear-gradient(90deg, rgba(37,99,235,0.20), rgba(37,99,235,0.07))'
            : 'transparent',
          border: active
            ? '1px solid rgba(96,165,250,0.16)'
            : '1px solid transparent',
          transition:
            'background 0.18s ease, color 0.18s ease, transform 0.18s ease',
        }}
      >
        {active && (
          <span
            style={{
              position: 'absolute',
              left: -1,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 999,
              background: '#38bdf8',
            }}
          />
        )}

        <span
          style={{
            width: 31,
            height: 31,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: active
              ? 'rgba(56,189,248,0.12)'
              : 'rgba(255,255,255,0.035)',
            border: active
              ? '1px solid rgba(56,189,248,0.16)'
              : '1px solid rgba(255,255,255,0.04)',
            fontSize: 15,
          }}
        >
          {icon}
        </span>

        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: active ? 800 : 650,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>

        {badge && (
          <span
            style={{
              padding: '3px 6px',
              borderRadius: 999,
              background: '#fef3c7',
              color: '#92400e',
              fontSize: 8,
              fontWeight: 900,
              letterSpacing: '0.04em',
            }}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const SectionLabel = ({ children }) => (
    <div
      style={{
        marginTop: 18,
        marginBottom: 7,
        padding: '0 10px',
        fontSize: 9,
        fontWeight: 850,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.11em',
      }}
    >
      {children}
    </div>
  );

  if (!user) {
    return (
      <div className="app-shell">
        <aside
          className="sidebar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '22px 16px',
            background:
              'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)',
            borderRight:
              '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <RefreshBrand />

          <div
            style={{
              marginTop: 28,
              padding: '14px 12px',
              borderRadius: 14,
              background:
                'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(56,189,248,0.05))',
              border:
                '1px solid rgba(96,165,250,0.12)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 850,
                color: '#38bdf8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Welcome
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 12,
                color: '#cbd5e1',
                lineHeight: 1.5,
              }}
            >
              Explore your virtual currency
              trading workspace.
            </div>
          </div>

          <nav style={{ marginTop: 14 }}>
            <SectionLabel>Account</SectionLabel>

            <NavItem
              to="/"
              icon="⌂"
              label="Sign In"
            />

            <NavItem
              to="/register"
              icon="✦"
              label="Create Account"
            />
          </nav>

          <div
            style={{
              marginTop: 'auto',
              padding: '12px',
              borderRadius: 13,
              background:
                'rgba(255,255,255,0.035)',
              border:
                '1px solid rgba(255,255,255,0.06)',
              color: '#64748b',
              fontSize: 9,
              lineHeight: 1.55,
            }}
          >
            <div
              style={{
                color: '#94a3b8',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              Demo Environment
            </div>

            <div style={{ marginTop: 4 }}>
              Virtual money only. No real
              currency or payments.
            </div>
          </div>
        </aside>

        <main className="auth-main">
          <Routes>
            <Route
              path="/"
              element={<LoginForm mode="login" />}
            />

            <Route
              path="/login"
              element={<LoginForm mode="login" />}
            />

            <Route
              path="/register"
              element={<LoginForm mode="register" />}
            />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside
        className="sidebar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 14px 14px',
          background:
            'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)',
          borderRight:
            '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* BRAND */}
        <div
          style={{
            padding: '4px 6px 14px',
            borderBottom:
              '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <RefreshBrand />
        </div>

        {/* USER MINI CARD */}
        <Link
          to="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 15,
            padding: '10px 9px',
            borderRadius: 14,
            textDecoration: 'none',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))',
            border:
              '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              width: 35,
              height: 35,
              borderRadius: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background:
                'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 850,
              boxShadow:
                '0 6px 14px rgba(37,99,235,0.20)',
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: '#f8fafc',
                fontSize: 11,
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name || 'FXWallet User'}
            </div>

            <div
              style={{
                marginTop: 2,
                color: '#64748b',
                fontSize: 9,
              }}
            >
              Open Profile →
            </div>
          </div>
        </Link>

        {/* NAVIGATION */}
        <nav
          style={{
            marginTop: 8,
            flex: 1,
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          <SectionLabel>Overview</SectionLabel>

          <NavItem
            to="/"
            icon="⌂"
            label="Dashboard"
          />

          <NavItem
            to="/market"
            icon="↗"
            label="Market"
          />

          <NavItem
            to="/portfolio"
            icon="◈"
            label="Portfolio"
          />

          <SectionLabel>Trading</SectionLabel>

          <NavItem
            to="/transactions"
            icon="⇄"
            label="Transactions"
          />

          <NavItem
            to="/alerts"
            icon="⌁"
            label="Rate Alerts"
          />

          <SectionLabel>Intelligence</SectionLabel>

          <NavItem
            to="/advisor"
            icon="✦"
            label="Smart Advisor"
          />

          <NavItem
            to="/premium-advisor"
            icon="✧"
            label="Premium Advisor"
            badge="PRO"
          />

          <SectionLabel>Account</SectionLabel>

          
          <NavItem
            to="/support"
            icon="?"
            label="FXWallet Support"
          />

          
          <NavItem
            to="/profile"
            icon="◉"
            label="Profile"
          />
        </nav>

        {/* PREMIUM CARD */}
        <Link
          to="/premium"
          style={{
            display: 'block',
            textDecoration: 'none',
            marginTop: 10,
            padding: 13,
            borderRadius: 15,
            background:
              'linear-gradient(135deg, rgba(37,99,235,0.20), rgba(124,58,237,0.16))',
            border:
              '1px solid rgba(129,140,248,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background:
                  'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
              }}
            >
              💎
            </div>

            <div>
              <div
                style={{
                  color: '#f8fafc',
                  fontSize: 11,
                  fontWeight: 850,
                }}
              >
                FXWallet Premium
              </div>

              <div
                style={{
                  marginTop: 2,
                  color: '#94a3b8',
                  fontSize: 9,
                }}
              >
                ₹999/month • Explore →
              </div>
            </div>
          </div>
        </Link>

        {/* DEMO NOTE */}
        <div
          style={{
            marginTop: 9,
            padding: '9px 10px',
            color: '#64748b',
            fontSize: 8,
            lineHeight: 1.45,
            textAlign: 'center',
          }}
        >
          VIRTUAL SIMULATION
          <br />
          No real currency or payments
        </div>
      </aside>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <Link to="/" className={location.pathname === '/' ? 'mobile-nav-item active' : 'mobile-nav-item'}>
          <span>⌂</span><small>Home</small>
        </Link>
        <Link to="/market" className={location.pathname === '/market' ? 'mobile-nav-item active' : 'mobile-nav-item'}>
          <span>↗</span><small>Market</small>
        </Link>
        <Link to="/portfolio" className={location.pathname === '/portfolio' ? 'mobile-nav-item active' : 'mobile-nav-item'}>
          <span>◈</span><small>Portfolio</small>
        </Link>
        <Link to="/transactions" className={location.pathname === '/transactions' ? 'mobile-nav-item active' : 'mobile-nav-item'}>
          <span>⇄</span><small>Trades</small>
        </Link>
        <Link to="/advisor" className={location.pathname === '/advisor' ? 'mobile-nav-item active' : 'mobile-nav-item'}>
          <span>✦</span><small>Advisor</small>
        </Link>
        <Link to="/profile" className={location.pathname === '/profile' ? 'mobile-nav-item active' : 'mobile-nav-item'}>
          <span>◉</span><small>Profile</small>
        </Link>
      </nav>

      <main>
        <Routes>
          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/market"
            element={<Market />}
          />

          <Route
            path="/portfolio"
            element={<Portfolio />}
          />

          <Route
            path="/transactions"
            element={<Transactions />}
          />

          <Route
            path="/alerts"
            element={<Alerts />}
          />

          <Route
            path="/advisor"
            element={<Advisor />}
          />

          <Route
            path="/premium-advisor"
            element={<PremiumAdvisor />}
          />

          <Route
            path="/premium"
            element={<Premium />}
          />
          <Route path="/support" element={<Support />} />

          <Route
            path="/profile"
            element={<Profile />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}




