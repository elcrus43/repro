import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SocialAccountsCard } from './SocialAccountsCard';

describe('SocialAccountsCard', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({
                vk: { hasToken: false, label: '' },
                tg: { hasToken: false, chatId: '', label: '' },
            }),
        });
    });

    it('renders all 5 social networks and toggles connection via UPDATE_PROFILE', async () => {
        const dispatch = vi.fn().mockResolvedValue(true);
        const toast = { success: vi.fn(), error: vi.fn() };
        const user = {
            id: 'user-1',
            full_name: 'Иван Риелтор',
            passport_details: { tax_status: 'Самозанятый' },
        };

        render(<SocialAccountsCard user={user} dispatch={dispatch} toast={toast} />);

        expect(screen.getByText('0 из 5')).toBeInTheDocument();
        expect(screen.getByText('ВКонтакте')).toBeInTheDocument();
        expect(screen.getByText('Одноклассники')).toBeInTheDocument();
        expect(screen.getByText('Telegram')).toBeInTheDocument();
        expect(screen.getByText('Instagram')).toBeInTheDocument();
        expect(screen.getByText('WhatsApp')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('switch', { name: 'Подключить ВКонтакте' }));

        await waitFor(() => {
            expect(dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'UPDATE_PROFILE',
                    profile: expect.objectContaining({
                        id: 'user-1',
                        passport_details: expect.objectContaining({
                            tax_status: 'Самозанятый',
                            social_accounts: expect.objectContaining({
                                vk: expect.objectContaining({ enabled: true }),
                            }),
                        }),
                    }),
                })
            );
        });

        expect(screen.getByText('1 из 5')).toBeInTheDocument();
    });
});
