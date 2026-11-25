import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdsPage } from './AdsPage';
import { renderServiceBanner } from './serviceBannerRenderer';
import { SERVICE_CATEGORIES, BANNER_FORMATS, BANNER_PALETTE } from './serviceBannerData';

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

vi.mock('../../components/Toast', () => ({
  useToastContext: () => ({ toast: mockToast })
}));

vi.mock('../../lib/savedBanners', () => ({
  fetchSavedBanners: vi.fn().mockResolvedValue({ data: [], error: null }),
  saveBannerToDb: vi.fn().mockResolvedValue({
    data: {
      id: 'saved-1',
      kind: 'ads',
      title: 'Тестовый баннер',
      format: 'story',
      image_data: 'data:image/png;base64,mock',
      created_at: new Date().toISOString()
    },
    error: null
  }),
  deleteSavedBanner: vi.fn().mockResolvedValue({ error: null }),
  shareSavedBanner: vi.fn().mockResolvedValue({ ok: true, message: 'Баннер отправлен' })
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
    expect(screen.getByText(/МАРКЕТИНГ/i)).toBeInTheDocument();
    expect(screen.getAllByText('Скачать PNG').length).toBeGreaterThan(0);
    expect(screen.getByText('Предпросмотр баннера')).toBeInTheDocument();
  });

  it('allows selecting different services and updates slogan and badges', () => {
    render(<AdsPage />);

    // Initially "Продажа" is active
    expect(screen.getByText('1. Услуга')).toBeInTheDocument();

    // Click on "Ипотека" service card
    const mortgageBtn = screen.getByText('Ипотека');
    fireEvent.click(mortgageBtn);

    // Switch to Slogan tab to verify mortgage slogan and per-service benefits library are loaded
    fireEvent.click(screen.getByText('2. Слоган & Текст'));
    const textarea = screen.getByPlaceholderText('Введите привлекающий внимание слоган...');
    expect(textarea.value).toContain('ипотек');
    expect(screen.getByText(/База преимуществ \(Ипотека\)/i)).toBeInTheDocument();
  });

  it('allows adjusting font size sliders for slogan and benefits', () => {
    render(<AdsPage />);

    // Click on Slogan tab
    fireEvent.click(screen.getByText('2. Слоган & Текст'));

    // Check slogan size slider
    expect(screen.getByText(/Размер шрифта слогана: 100%/i)).toBeInTheDocument();

    // Check benefits size slider
    expect(screen.getByText(/Размер шрифта преимуществ: 100%/i)).toBeInTheDocument();

    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(2);

    // Change slogan slider
    fireEvent.change(sliders[0], { target: { value: '120' } });
    expect(screen.getByText(/Размер шрифта слогана: 120%/i)).toBeInTheDocument();

    // Change benefits slider
    fireEvent.change(sliders[1], { target: { value: '90' } });
    expect(screen.getByText(/Размер шрифта преимуществ: 90%/i)).toBeInTheDocument();
  });

  it('allows adding and deleting key benefits in Slogan tab', () => {
    render(<AdsPage />);

    // Click on Slogan tab
    fireEvent.click(screen.getByText('2. Слоган & Текст'));

    // Verify benefits section exists
    expect(screen.getByText('Ключевые преимущества')).toBeInTheDocument();

    // Click "Добавить преимущество"
    const addBtn = screen.getByText('Добавить преимущество');
    fireEvent.click(addBtn);
    expect(mockToast.success).toHaveBeenCalledWith('Преимущество добавлено и сохранено в базе');

    // Delete a benefit
    const deleteBtns = screen.getAllByTitle('Удалить преимущество');
    expect(deleteBtns.length).toBeGreaterThan(0);
    fireEvent.click(deleteBtns[0]);
    expect(mockToast.success).toHaveBeenCalledWith('Преимущество удалено');

    // Verify persistent benefits library exists and supports click-to-add & edit/save
    expect(screen.getByText(/База преимуществ/i)).toBeInTheDocument();
    const editLibBtns = screen.getAllByTitle('Редактировать в базе');
    expect(editLibBtns.length).toBeGreaterThan(0);
    fireEvent.click(editLibBtns[0]);

    const saveLibBtn = screen.getByTitle('Сохранить преимущество в базе');
    fireEvent.click(saveLibBtn);
    expect(mockToast.success).toHaveBeenCalledWith('Преимущество сохранено в базе');
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

  it('allows switching formats, bottom tone, 5-color palette and textures on Design tab', () => {
    render(<AdsPage />);

    // Switch to Design tab
    fireEvent.click(screen.getByText('3. Оформление'));

    expect(screen.getByText('Оформление и визуальный стиль')).toBeInTheDocument();

    // Click on Square format
    const squareBtn = screen.getByText('Квадрат');
    fireEvent.click(squareBtn);

    // Switch bottom tone to Light
    const lightToneBtn = screen.getByText('Светлый фон');
    fireEvent.click(lightToneBtn);
    expect(lightToneBtn).toBeInTheDocument();

    // Select a color from 5-color palette
    const goldColorBtn = screen.getByText('Золотой');
    fireEvent.click(goldColorBtn);

    // Select a visual texture preset
    const marblePreset = screen.getByText('Мрамор');
    fireEvent.click(marblePreset);
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

    // Edit badge
    const editBtns = screen.getAllByTitle('Редактировать стикер');
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);

    // Save edited badge
    const saveBadgeBtn = screen.getByTitle('Сохранить стикер');
    fireEvent.click(saveBadgeBtn);
    expect(mockToast.success).toHaveBeenCalledWith('Стикер сохранен в базе');
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

  it('allows selecting custom colors for slogan, benefits and phone and text backdrop', () => {
    render(<AdsPage />);

    // Slogan & Benefits colors on Tab 2
    fireEvent.click(screen.getByText('2. Слоган & Текст'));
    expect(screen.getByText(/Цвет текста слогана/i)).toBeInTheDocument();
    expect(screen.getByText(/Цвет текста преимуществ/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Цвет текста слогана: Золотой'));
    fireEvent.click(screen.getByLabelText('Цвет текста преимуществ: Голубой'));

    // Text backdrop on Tab 3
    fireEvent.click(screen.getByText('3. Оформление'));
    expect(screen.getByText(/Полупрозрачный фон для текста/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Тёмное стекло'));

    // Phone color on Tab 5
    fireEvent.click(screen.getByText('5. Контакты'));
    expect(screen.getByText(/Цвет телефона/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Цвет телефона: Изумруд'));
  });

  it('allows saving a banner to database and deleting it from saved gallery', async () => {
    render(<AdsPage />);

    expect(screen.getByText(/Сохранённые баннеры \(0\)/i)).toBeInTheDocument();

    const saveBtn = screen.getByText('Сохранить');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Баннер сохранен в базе');
      expect(screen.getByText(/Сохранённые баннеры \(1\)/i)).toBeInTheDocument();
    });

    const delBtn = screen.getByTitle('Удалить баннер');
    fireEvent.click(delBtn);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Баннер удален');
      expect(screen.getByText(/Сохранённые баннеры \(0\)/i)).toBeInTheDocument();
    });
  });

  it('renders canvas correctly using renderServiceBanner without exceptions', () => {
    const mockCanvas = document.createElement('canvas');
    expect(() => {
      renderServiceBanner(mockCanvas, {
        format: BANNER_FORMATS.square,
        bottomTone: 'light',
        accentColor: BANNER_PALETTE[1].color,
        badgeText: 'ВЫГОДНО',
        slogan: 'Продам вашу квартиру дороже рынка',
        bullets: ['Бесплатная оценка', '12+ площадок', 'Юридическая защита'],
        ctaText: 'Получить консультацию',
        agentName: 'Александр',
        agentPhone: '8 (909) 130-40-90',
        sloganColor: '#FACC15',
        bulletColor: '#FFFFFF',
        phoneColor: '#34D399',
        textBackdrop: 'dark_glass'
      });
    }).not.toThrow();

    expect(mockCanvas.width).toBe(1080);
    expect(mockCanvas.height).toBe(1080);
  });
});
