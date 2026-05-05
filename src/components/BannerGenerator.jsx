import React from 'react';

export function BannerGenerator({ onClose }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{ background: 'white', color: 'black', padding: 40, borderRadius: 20 }}>
                <h2>Тестовый баннер</h2>
                <button className="btn btn-primary" onClick={onClose}>Закрыть</button>
            </div>
        </div>
    );
}
