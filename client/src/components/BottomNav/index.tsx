import { useLocation, useNavigate } from 'react-router-dom';
import { useT } from '../../i18n';

export default function BottomNav() {
  const { t } = useT();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { key: '/m', icon: 'search', label: t('nav.search') },
    { key: '/m/saved', icon: 'favorite', label: t('nav.saved') },
    { key: '/m/orders', icon: 'luggage', label: t('nav.orders') },
    { key: '/m/profile', icon: 'person', label: t('nav.profile') },
  ];

  return (
    <nav className="bg-white border-t border-gray-100 px-6 py-2 pb-5 shrink-0 z-30 font-['Plus_Jakarta_Sans']">
      <ul className="flex justify-between items-center m-0 p-0 list-none">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.key;
          return (
            <li key={tab.key} className="flex-1">
              <a
                className={`flex flex-col items-center gap-1 cursor-pointer transition-colors select-none ${isActive ? 'text-sky-500' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={(e) => {
                  e.preventDefault();
                  // We only have /m implemented for now, but keep navigation open for future
                  navigate(tab.key);
                }}
              >
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''} text-[24px]`}>
                  {tab.icon}
                </span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
