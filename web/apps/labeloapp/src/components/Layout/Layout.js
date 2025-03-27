import React from 'react';

export const LayoutSidebar = ({children, menuItems, path}) => {
  return (
    <div className="layout-sidebar">
      {menuItems && menuItems.length > 1 && (
        <div className="layout-sidebar__navigation">
          <nav>
            {menuItems.map((item, index) => (
              <a 
                key={index} 
                href={item.path}
                className={`
                  menu-item 
                  ${path === item.path ? 'active' : ''}
                `}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
      <div className="layout-sidebar__content">
        {children}
      </div>
    </div>
  );
};