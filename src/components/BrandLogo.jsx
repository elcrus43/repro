import React from 'react';
import logoLight from '../assets/logo.png';
import logoDark from '../assets/logo-white.png';

/**
 * BrandLogo — официальный логотип REA CRM.
 * 
 * Поддерживает адаптацию к светлой и тёмной теме:
 * - variant="auto" (по умолчанию): в тёмной теме белый текст REA + синие акценты, в светлой — тёмный текст REA + синие акценты.
 * - variant="light": тёмный вариант для светлых поверхностей.
 * - variant="dark": белый вариант для тёмных поверхностей.
 * 
 * @param {Object} props
 * @param {number} [props.height=32] - высота логотипа в px
 * @param {'auto'|'light'|'dark'} [props.variant='auto'] - вариант отображения
 * @param {string} [props.className=''] - дополнительный класс
 * @param {React.CSSProperties} [props.style={}] - стили
 * @param {string} [props.alt='REA CRM'] - alt текст
 */
export function BrandLogo({
  height = 32,
  variant = 'auto',
  className = '',
  style = {},
  alt = 'REA CRM'
}) {
  const width = Math.round(height * (372 / 69));

  if (variant === 'light') {
    return (
      <img
        src={logoLight}
        alt={alt}
        height={height}
        width={width}
        className={`brand-logo ${className}`}
        style={{
          height,
          width: 'auto',
          maxWidth: '100%',
          display: 'block',
          objectFit: 'contain',
          ...style
        }}
        loading="eager"
      />
    );
  }

  if (variant === 'dark') {
    return (
      <img
        src={logoDark}
        alt={alt}
        height={height}
        width={width}
        className={`brand-logo ${className}`}
        style={{
          height,
          width: 'auto',
          maxWidth: '100%',
          display: 'block',
          objectFit: 'contain',
          ...style
        }}
        loading="eager"
      />
    );
  }

  // variant === 'auto': переключение через CSS в зависимости от темы
  return (
    <div
      className={`brand-logo-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height,
        ...style
      }}
    >
      <img
        src={logoLight}
        alt={alt}
        height={height}
        width={width}
        className="brand-logo-img brand-logo-img-light"
        style={{
          height,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain'
        }}
        loading="eager"
      />
      <img
        src={logoDark}
        alt={alt}
        height={height}
        width={width}
        className="brand-logo-img brand-logo-img-dark"
        style={{
          height,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain'
        }}
        loading="eager"
      />
    </div>
  );
}

export default BrandLogo;
