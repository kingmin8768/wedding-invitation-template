import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const initialForms = {
  login: {
    email: '',
    password: '',
  },
  signup: {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  },
};

const AuthPage = ({ mode }) => {
  const { authReady, isAdmin, isAuthenticated, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initialForms[mode]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';
  const adminTargetPath = location.state?.from?.pathname || '/admin';
  const memberTargetPath = location.state?.from?.pathname || '/';

  if (authReady && isAuthenticated && isAdmin) {
    return <Navigate replace to={adminTargetPath} />;
  }

  if (authReady && isAuthenticated && !isAdmin) {
    return <Navigate replace to={memberTargetPath} />;
  }

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isLogin && form.password !== form.confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);

    try {
      const user = isLogin
        ? await signIn({
            email: form.email,
            password: form.password,
          })
        : await signUp({
            name: form.name,
            email: form.email,
            password: form.password,
          });

      navigate(user.role === 'admin' ? adminTargetPath : memberTargetPath, { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="auth-kicker">Wedding Invitation Account</p>
        <h1 className="auth-title">{isLogin ? '로그인' : '회원가입'}</h1>
        <p className="auth-helper">
          공개 청첩장 화면은 유지한 채, 계정과 관리자 흐름만 별도 라우트로 분리했습니다.
        </p>

        <div className="auth-route-switch">
          <Link className={`auth-route-link ${isLogin ? 'active' : ''}`} to="/login">
            로그인
          </Link>
          <Link className={`auth-route-link ${!isLogin ? 'active' : ''}`} to="/signup">
            회원가입
          </Link>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <label className="auth-field">
              <span>이름</span>
              <input
                autoComplete="name"
                name="name"
                onChange={updateField}
                required
                type="text"
                value={form.name}
              />
            </label>
          )}

          <label className="auth-field">
            <span>이메일</span>
            <input
              autoComplete="email"
              name="email"
              onChange={updateField}
              required
              type="email"
              value={form.email}
            />
          </label>

          <label className="auth-field">
            <span>비밀번호</span>
            <input
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength="8"
              name="password"
              onChange={updateField}
              required
              type="password"
              value={form.password}
            />
          </label>

          {!isLogin && (
            <label className="auth-field">
              <span>비밀번호 확인</span>
              <input
                autoComplete="new-password"
                minLength="8"
                name="confirmPassword"
                onChange={updateField}
                required
                type="password"
                value={form.confirmPassword}
              />
            </label>
          )}

          {location.state?.denied && <p className="auth-notice">관리자 권한이 필요한 화면입니다.</p>}
          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        <div className="auth-footer-links">
          <Link className="auth-text-link" to="/">
            청첩장으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
};

AuthPage.propTypes = {
  mode: PropTypes.oneOf(['login', 'signup']).isRequired,
};

export default AuthPage;
