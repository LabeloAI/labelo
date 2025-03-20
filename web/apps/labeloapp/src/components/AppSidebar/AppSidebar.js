import React from 'react';
import { cn } from '../../utils/bem';
import "./AppSidebar.styl";

export const AppSidebar = ({ title, navItems, footer, children, collapsed, onToggleCollapse, style }) => {
  const rootClass = cn("app-sidebar");
  
  return (
    <div className={rootClass()} style={style}>
      {title && (
        <div className={rootClass.elem("header")}>
          <div className={rootClass.elem("title")}>
            {title}
          </div>
          
          {onToggleCollapse && (
            <button 
              className={rootClass.elem("toggle")} 
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? "→" : "←"}
            </button>
          )}
        </div>
      )}
      
      {navItems && navItems.length > 0 && (
        <nav className={rootClass.elem("nav")}>
          <ul className={rootClass.elem("nav-list")}>
            {navItems.map((item, index) => (
              <li 
                key={index} 
                className={rootClass.elem("nav-item", { active: item.active })}
              >
                {item.icon && (
                  <span className={rootClass.elem("nav-icon")}>{item.icon}</span>
                )}
                {!collapsed && (
                  <span className={rootClass.elem("nav-label")}>{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
      
      <div className={rootClass.elem("content")}>
        {children}
      </div>
      
      {footer && (
        <div className={rootClass.elem("footer")}>
          {footer}
        </div>
      )}
    </div>
  );
};