import React from 'react';

export function FormCard({ title, children, style = {} }) {
    return (
        <div className="card" style={{ 
            padding: '24px', 
            border: 'none', 
            boxShadow: '0 8px 32px rgba(0,0,0,0.03)', 
            borderRadius: 32, 
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            ...style 
        }}>
            {title && (
                <div className="font-oswald" style={{ 
                    fontWeight: 700, 
                    fontSize: 14, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    color: 'var(--text-muted)',
                    marginBottom: 4
                }}>
                    {title}
                </div>
            )}
            {children}
        </div>
    );
}
