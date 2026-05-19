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
                    fontWeight: 600, 
                    fontSize: 16, 
                    color: '#000',
                    marginBottom: 8,
                    letterSpacing: '0.01em'
                }}>
                    {title}
                </div>
            )}
            {children}
        </div>
    );
}
