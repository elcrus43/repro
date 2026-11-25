import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevelopmentBannerModal } from './DevelopmentBannerModal';
import { buildDevelopmentBannerCaption } from '../lib/socialShare';

// Mock AppContext
vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    state: {
      currentUser: {
        id: 'u-1',
        full_name: 'Александр Ельчугин',
        phone: '+79091304090',
      },
    },
  }),
}));

describe('DevelopmentBannerModal Component', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      measureText: vi.fn().mockReturnValue({ width: 120 }),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      roundRect: vi.fn(),
      clip: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,fake'),
    });
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,fake');
  });

  const sampleDev = {
    id: 'dev-1',
    name: 'ЖК Булычев',
    developer: 'Железно', // SHOULD NEVER BE SHOWN!
    developer_name: 'Железно',
    address: 'ул. Панфиловцев 22',
    district: 'ЮЗР',
    completion_date: 'IV кв. 2026',
    finishing: 'Предчистовая White Box',
    image: '/images/developments/zhk-bulychev.jpg',
  };

  const sampleLayout = {
    groupKey: 'grp-1',
    roomsLabel: '1-комнатная квартира',
    name: '1-комнатная квартира',
    area: 38.4,
    minPrice: 4350000,
    minPriceSqm: 113280,
    planImage: 'https://example.com/plan.png',
    finishing: 'White Box',
    provider: 'zhelezno',
    providerLabel: 'Железно',
  };

  it('renders complex name, layout title, and price correctly', () => {
    render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={sampleLayout}
        onClose={() => {}}
      />
    );

    // Title line contains complex name and room type
    expect(screen.getByText(/ЖК Булычев · 1-комнатная квартира/i)).toBeInTheDocument();

    // Inputs have default values
    const devInput = screen.getByDisplayValue('ЖК Булычев');
    expect(devInput).toBeInTheDocument();

    const roomInput = screen.getByDisplayValue('1-комнатная квартира');
    expect(roomInput).toBeInTheDocument();

    const priceInput = screen.getByDisplayValue('4350000');
    expect(priceInput).toBeInTheDocument();
  });

  it('STRICTLY DOES NOT render the developer name on the banner or UI badge', () => {
    const { container } = render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={sampleLayout}
        onClose={() => {}}
      />
    );

    const fullText = container.textContent || '';
    // Neither 'Железно' nor 'СМУ-5' should appear anywhere as an attribution
    expect(fullText).not.toContain('Застройщик');
    expect(fullText).not.toContain('Железно');
  });

  it('allows user to customize phone and agent name', () => {
    render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={sampleLayout}
        currentUser={{ full_name: 'Иван Риелтор', phone: '+79991234567' }}
        onClose={() => {}}
      />
    );

    const phoneInput = screen.getByDisplayValue('+7 (999) 123-45-67');
    expect(phoneInput).toBeInTheDocument();

    fireEvent.change(phoneInput, { target: { value: '+79001112233' } });
    expect(phoneInput.value).toBe('+79001112233');
  });

  it('switches banner formats between Stories, Post, and Square', () => {
    render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={sampleLayout}
        onClose={() => {}}
      />
    );

    const postBtn = screen.getByText('Пост').closest('button');
    fireEvent.click(postBtn);
    expect(postBtn).toHaveClass('active');

    const squareBtn = screen.getByText('Квадрат').closest('button');
    fireEvent.click(squareBtn);
    expect(squareBtn).toHaveClass('active');
  });

  it('allows adding a custom advantage sticker', () => {
    render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={sampleLayout}
        onClose={() => {}}
      />
    );

    const customInput = screen.getByPlaceholderText('Добавить свою особенность...');
    fireEvent.change(customInput, { target: { value: 'Теплый пол в подарок' } });

    const addBtn = screen.getByText('+ Добавить');
    fireEvent.click(addBtn);

    expect(screen.getByText('Теплый пол в подарок')).toBeInTheDocument();
  });

  it('closes on Escape key press or close button click', () => {
    const onClose = vi.fn();
    render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={sampleLayout}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByLabelText('Закрыть генератор');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('provides showAddress toggle checkbox', () => {
    render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={sampleLayout}
        onClose={() => {}}
      />
    );

    const addrCheckbox = screen.getByLabelText(/Показать адрес на баннере/i);
    expect(addrCheckbox).toBeInTheDocument();
    expect(addrCheckbox.checked).toBe(true);

    fireEvent.click(addrCheckbox);
    expect(addrCheckbox.checked).toBe(false);
  });

  it('provides showPriceFrom toggle and defaults to false for a specific apartment', () => {
    // Specific flat with flat_number
    const singleAptLayout = {
      ...sampleLayout,
      flat_number: '84',
      count: 1,
    };

    render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={singleAptLayout}
        onClose={() => {}}
      />
    );

    const priceFromCheckbox = screen.getByLabelText(/Приставка «от» к стоимости/i);
    expect(priceFromCheckbox).toBeInTheDocument();
    // Default for specific apartment is false (exact price)
    expect(priceFromCheckbox.checked).toBe(false);

    fireEvent.click(priceFromCheckbox);
    expect(priceFromCheckbox.checked).toBe(true);
  });

  it('shows floorplan upload section and status', () => {
    render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={sampleLayout}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/Чертеж прикреплен/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Заменить чертеж/i })).toBeInTheDocument();
  }, 15000);

  it('renders grid_hero composition mode and photos section with multiple images', () => {
    const devWithImages = {
      ...sampleDev,
      images: [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
      ],
    };

    render(
      <DevelopmentBannerModal
        development={devWithImages}
        layout={sampleLayout}
        onClose={() => {}}
      />
    );

    // Composition button "Сетка + План" exists and is active by default
    const gridHeroBtn = screen.getByRole('button', { name: /Сетка \+ План/i });
    expect(gridHeroBtn).toBeInTheDocument();
    expect(gridHeroBtn).toHaveClass('active');

    // Photos section title and counter
    expect(screen.getByText(/Фотографии ЖК \(сетка\)/i)).toBeInTheDocument();
    expect(screen.getByText(/3 из 4/i)).toBeInTheDocument();

    // Check toggles for price 'от' and address
    const priceFromCheckbox = screen.getByRole('checkbox', { name: /Приставка «от» к стоимости/i });
    expect(priceFromCheckbox).toBeInTheDocument();

    const addressCheckbox = screen.getByRole('checkbox', { name: /Показать адрес на баннере/i });
    expect(addressCheckbox).toBeInTheDocument();
    expect(addressCheckbox).toBeChecked();

    fireEvent.click(addressCheckbox);
    expect(addressCheckbox).not.toBeChecked();
  }, 15000);

  it('renders advertising slogan, badge, and CTA controls', () => {
    render(
      <DevelopmentBannerModal
        development={sampleDev}
        layout={sampleLayout}
        onClose={() => {}}
      />
    );

    // Advertising Badge section
    expect(screen.getByText(/Рекламный бейдж \/ Стикер/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('⚡ СЕМЕЙНАЯ ИПОТЕКА 6%')).toBeInTheDocument();

    // Slogan section
    expect(screen.getByText(/Рекламный оффер \/ Слоган/i)).toBeInTheDocument();
    expect(screen.getByText('По ценам застройщика без переплат')).toBeInTheDocument();

    // CTA section
    expect(screen.getByText(/Кнопка призыва \(CTA\)/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Забронировать по цене застройщика')).toBeInTheDocument();
  });
});

describe('buildDevelopmentBannerCaption helper', () => {
  it('generates selling caption without developer name', () => {
    const caption = buildDevelopmentBannerCaption({
      dev: { name: 'ЖК Булычев', developer: 'Железно', address: 'ул. Панфиловцев 22', district: 'ЮЗР', completion_date: 'IV кв. 2026' },
      layout: { roomsLabel: 'Евро-2', area: 42.5, minPrice: 4800000 },
      phone: '+7 (909) 130-40-90',
      agentName: 'Александр',
      stickers: ['Прямые цены застройщика', 'Семейная ипотека от 6%'],
    });

    expect(caption).toContain('ЖК Булычев');
    expect(caption).toContain('Евро-2 · 42.5 м²');
    expect(caption).toContain('4 800 000 ₽');
    expect(caption).toContain('Прямые цены застройщика');
    expect(caption).toContain('+7 (909) 130-40-90');
    // STRICTLY NO DEVELOPER
    expect(caption).not.toContain('Железно');
    expect(caption).not.toContain('Застройщик');
  });

  it('respects showPriceFrom=false and showAddress=false in caption', () => {
    const caption = buildDevelopmentBannerCaption({
      dev: { name: 'Дом на Чистопрудненской, 11А', address: 'ул. Чистопрудненская, 11А' },
      layout: { roomsLabel: '1-комнатная', area: 31.8, price: 4770000, price_sqm: 150000 },
      showPriceFrom: false,
      showAddress: false,
    });

    expect(caption).toContain('Цена: 4 770 000 ₽');
    expect(caption).not.toContain('Цена: от');
    expect(caption).not.toContain('Локация:');
  });
});
