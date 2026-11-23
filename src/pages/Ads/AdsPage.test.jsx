import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdsPage } from './AdsPage';
import { renderServiceBanner } from './serviceBannerRenderer';
import { SERVICE_CATEGORIES, BANNER_FORMATS, DESIGN_THEMES } from './serviceBannerData';

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

vi.mock('../../components/Toast', () => ({
  useToastContext: () => ({ toast: mockToast })
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    state: {
      currentUser: {
        id: 'u-1',
        full_name: 'Александр Ельчугин',
        phone: '89091304090',
        role: 'realtor'
      }
    }
  })
}));

describe('AdsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 120 })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      quadraticCurveTo: vi.fn(),
      clip: vi.fn()
    }));

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
  });

  it('renders page header and main generator sections', () => {
    render(<AdsPage />);

    expect(screen.getByText('Генератор рекламных баннеров услуг')).toBeInTheDocument();
    expect(screen.getByText(/МАРКЕТИНГ И ПРОДВИЖЕНИЕ/i)).toBeInTheDocument();
    expect(screen.getAllByText('Скачать PNG').length).toBeGreaterThan(0);
    expect(screen.getByText('Предпросмотр баннера')).toBeInTheDocument();
  });

  it('allows selecting different services and updates slogan and title', () => {
    render(<AdsPage />);

    // Initially "Продажа" is active
    expect(screen.getByText('1. Услуга')).toBeInTheDocument();

    // Click on "Ипотека" service card
    const mortgageBtn = screen.getByText('Ипотека');
    fireEvent.click(mortgageBtn);

    // Verify input updated with mortgage service title
    const titleInput = screen.getByDisplayValue('Одобрение ипотеки');
    expect(titleInput).toBeInTheDocument();
  });

  it('allows navigating to Slogan tab and editing slogan', () => {
    render(<AdsPage />);

    // Click on Slogan tab
    const sloganTab = screen.getByText('2. Слоган & Текст');
    fireEvent.click(sloganTab);

    expect(screen.getByText('Выбор слогана и ключевых выгод')).toBeInTheDocument();

    // Click on a curated slogan chip
    const newBuildingsCurated = screen.getAllByRole('button');
    const sloganOptions = newBuildingsCurated.filter(b => b.textContent && b.textContent.includes('Продажа'));
    if (sloganOptions.length > 0) {
      fireEvent.click(sloganOptions[0]);
    }

    // Check textarea exists
    const textarea = screen.getByPlaceholderText('Введите привлекающий внимание слоган...');
    expect(textarea).toBeInTheDocument();

    // Type custom slogan
    fireEvent.change(textarea, { target: { value: 'Мой уникальный продающий слоган' } });
    expect(textarea.value).toBe('Мой уникальный продающий слоган');
  });

  it('allows switching formats and themes on Design tab', () => {
    render(<AdsPage />);

    // Switch to Design tab
    fireEvent.click(screen.getByText('3. Оформление'));

    expect(screen.getByText('Оформление и визуальный стиль')).toBeInTheDocument();

    // Click on Square format
    const squareBtn = screen.getByText('Квадрат');
    fireEvent.click(squareBtn);

    // Click on Emerald theme
    const emeraldTheme = screen.getByText('Изумруд Люкс');
    fireEvent.click(emeraldTheme);

    expect(emeraldTheme).toBeInTheDocument();
  });

  it('allows setting CTA and top badge on CTA tab', () => {
    render(<AdsPage />);

    // Switch to CTA tab
    fireEvent.click(screen.getByText('4. CTA & Стикер'));

    expect(screen.getByText('Призыв к действию (CTA) и стикеры')).toBeInTheDocument();

    // Select a popular CTA
    const ctaOption = screen.getByText('Узнать рыночную цену квартиры');
    fireEvent.click(ctaOption);

    const ctaInput = screen.getByDisplayValue('Узнать рыночную цену квартиры');
    expect(ctaInput).toBeInTheDocument();

    // Select a quick badge
    const badgeBtn = screen.getByText('0% КОМИССИИ');
    fireEvent.click(badgeBtn);

    expect(screen.getByDisplayValue('0% КОМИССИИ')).toBeInTheDocument();
  });

  it('allows modifying contact details on Contacts tab', () => {
    render(<AdsPage />);

    // Switch to Contacts tab
    fireEvent.click(screen.getByText('5. Контакты'));

    expect(screen.getByText(/Отображается внизу баннера крупной строкой/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('Имя Фамилия');
    expect(nameInput.value).toBe('Александр Ельчугин');

    fireEvent.change(nameInput, { target: { value: 'Иван Иванов' } });
    expect(nameInput.value).toBe('Иван Иванов');
  });

  it('copies post text to clipboard and triggers success notification', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve())
      }
    });

    render(<AdsPage />);

    const copyBtn = screen.getByText('Копировать пост');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Текст поста скопирован в буфер обмена');
    });
  });

  it('renders canvas correctly using renderServiceBanner without exceptions', () => {
    const mockCanvas = document.createElement('canvas');
    expect(() => {
      renderServiceBanner(mockCanvas, {
        format: BANNER_FORMATS.square,
        theme: DESIGN_THEMES[0],
        serviceTitle: 'Продажа недвижимости',
        badgeText: 'ВЫГОДНО',
        slogan: 'Продам вашу квартиру дороже рынка',
        bullets: ['Бесплатная оценка', '12+ площадок', 'Юридическая защита'],
        ctaText: 'Получить консультацию',
        agentName: 'Александр',
        agentPhone: '8 (909) 130-40-90'
      });
    }).not.toThrow();

    expect(mockCanvas.width).toBe(1080);
    expect(mockCanvas.height).toBe(1080);
  });
});
