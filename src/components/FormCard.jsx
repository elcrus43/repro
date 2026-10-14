import React from 'react';

export function FormCard({ title, action, children, style = {} }) {
    return (
        <div className="card" style={{ 
            padding: '18px', 
            border: '1px solid var(--border-light)', 
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)', 
            borderRadius: 24, 
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            ...style 
        }}>
            {(title || action) && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 8 
                }}>
                    {title && (
                        <div className="font-oswald" style={{ 
                            fontWeight: 600, 
                            fontSize: 16, 
                            color: 'var(--text)',
                            letterSpacing: '0.01em'
                        }}>
                            {title}
                        </div>
                    )}
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}
