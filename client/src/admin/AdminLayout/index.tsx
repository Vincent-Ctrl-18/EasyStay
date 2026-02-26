import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Spin, message, Alert } from 'antd';
import { ShopOutlined, AuditOutlined, LogoutOutlined } from '@ant-design/icons';
import useAuthStore from '../../stores/useAuthStore';
import { authAPI } from '../../api';
import { useT, useLanguageStore } from '../../i18n';
import './style.css';

const { Header, Sider, Content } = Layout;

const allowedRoutes: Record<string, string[]> = {
  merchant: ['/admin/hotels', '/admin/hotels/create', '/admin/hotels/edit'],
  admin: ['/admin/review']
};

function hasPermission(role: 'merchant' | 'admin', path: string): boolean {
  const routes = allowedRoutes[role] || [];
  return routes.some(route => path.startsWith(route) || path === route);
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, initialUser, initialToken, setAuth, logout } = useAuthStore();
  const { t } = useT();
  const toggleLang = useLanguageStore((s) => s.toggleLang);
  const lang = useLanguageStore((s) => s.lang);
  const [loading, setLoading] = useState(true);
  const [showConflictAlert, setShowConflictAlert] = useState(false);
  const conflictAlertShownRef = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        logout();
        setLoading(false);
        return;
      }
      
      try {
        const res = await authAPI.profile();
        setAuth(token, {
          id: res.data.id,
          username: res.data.username,
          role: res.data.role
        });
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    if (!user) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [user, setAuth, logout]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin/login');
    } else if (!loading && user) {
      if (location.pathname === '/admin' || location.pathname === '/admin/') {
        navigate(user.role === 'admin' ? '/admin/review' : '/admin/hotels', { replace: true });
      } else if (!hasPermission(user.role, location.pathname)) {
        message.error(t('admin.noPermission'));
        navigate(user.role === 'admin' ? '/admin/review' : '/admin/hotels', { replace: true });
      }
    }
  }, [user, loading, navigate, location.pathname, t]);

  // Detect storage changes from other tabs
  useEffect(() => {
    if (!initialUser || loading) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'token' || event.key === 'user' || event.key === null) {
        const currentToken = localStorage.getItem('token');
        const currentUserStr = localStorage.getItem('user');
        
        if (currentToken !== initialToken || currentUserStr !== JSON.stringify(initialUser)) {
          if (!conflictAlertShownRef.current) {
            setShowConflictAlert(true);
            conflictAlertShownRef.current = true;
            message.error('商户和管理员不能同时登陆');
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [initialToken, initialUser, loading]);

  const closeConflictAlert = () => {
    setShowConflictAlert(false);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) return null;

  const merchantMenuItems = [
    { key: '/admin/hotels', icon: <ShopOutlined />, label: t('admin.sidebar.myHotels') },
  ];

  const adminMenuItems = [
    { key: '/admin/review', icon: <AuditOutlined />, label: t('admin.sidebar.review') },
  ];

  const menuItems = user.role === 'admin' ? adminMenuItems : merchantMenuItems;

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <Layout className="admin-layout">
      {showConflictAlert && (
        <Alert
          message="商户和管理员不能同时登陆"
          description="检测到另一个角色已登录，请先退出再切换角色。"
          type="warning"
          closable
          onClose={closeConflictAlert}
          style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '80%' }}
        />
      )}
      <Sider theme="light" className="admin-sider">
        <div className="admin-logo">
          <h2>{t('admin.sidebar.title')}</h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <div className="header-left">
            <Typography.Text type="secondary">
              {user.role === 'admin' ? t('admin.header.admin') : t('admin.header.merchant')}: {user.username}
            </Typography.Text>
          </div>
          <div className="header-right-actions">
            <button className="lang-switch-inline" onClick={toggleLang}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>language</span>
              {lang === 'zh' ? 'English' : '中文'}
            </button>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              {t('admin.logout')}
            </Button>
          </div>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
