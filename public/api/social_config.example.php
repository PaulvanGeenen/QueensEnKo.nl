<?php
/**
 * Kopieer dit bestand naar social_config.php op de server (buiten git)
 * om direct automatisch te publiceren naar Facebook & Instagram via Meta Graph API.
 */
return [
    'fb_page_id' => '',          // Bijv. 100007789546947 (of de Pagina-ID uit Meta Business)
    'ig_user_id' => '',          // Instagram Business/Creator Account ID gekoppeld aan de FB-pagina
    'meta_access_token' => '',   // Long-lived Page Access Token met pages_manage_posts & instagram_content_publish
    'site_url' => 'https://queensenko.nl',
];
