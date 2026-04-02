import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export function DetailsPage() {
    const { id } = useParams();
    const { state } = useApp();
    const navigate = useNavigate();
    
    const showing = state.showings.find(s => s.id === id);
    if (!showing) return <div className="page"><div className="topbar"><button className="topbar-back" onClick={() => navigate(-1)}>←</button><span className="topbar-title">Показ не найден</span></div></div>;

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">Детали показа</span>
            </div>
            <div className="page-content">
                <div className="card">
                    <pre>{JSON.stringify(showing, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}
