export type SeasonalBackgrounds = {
    ends_at: string;
    backgrounds: SeasonalBackgrounds_Background[];
};

export type SeasonalBackgrounds_Background = {
    url: string;
    user: SeasonalBackgrounds_Background_User;
};

export type SeasonalBackgrounds_Background_User = {
    avatar_url: string;
    country_code: string;
    default_group: string;
    id: number;
    is_active: boolean;
    is_bot: boolean;
    is_deleted: boolean;
    is_online: boolean;
    is_supporter: boolean;
    last_visit: string;
    pm_friends_only: boolean;
    profile_colour: string | null;
    username: string;
};