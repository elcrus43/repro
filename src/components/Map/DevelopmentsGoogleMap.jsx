import React from 'react';
import { DevelopmentsMap } from './DevelopmentsMap';

/**
 * DevelopmentsGoogleMap
 * Интерактивная карта новостроек г. Кирова на базе Google Карт (через Leaflet)
 */
export function DevelopmentsGoogleMap(props) {
  return <DevelopmentsMap {...props} provider="google" />;
}
