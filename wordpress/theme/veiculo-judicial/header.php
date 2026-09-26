<?php
if (!defined('ABSPATH')) exit;
$vj = vj_tema_config();
$insta = ltrim((string) $vj['instagram'], '@');
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
  <header class="topo">
    <div class="wrap topo__in">
      <a class="marca" href="<?php echo esc_url(home_url('/')); ?>">
        <span class="marca__icone" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M6 20h20l-2.6-7.2a2 2 0 0 0-1.9-1.3H10.5a2 2 0 0 0-1.9 1.3z" /><circle cx="10.5" cy="21" r="2.6" /><circle cx="21.5" cy="21" r="2.6" /></svg>
        </span>
        <span>Veículo<b>Judicial</b></span>
      </a>
      <nav class="menu" aria-label="Principal">
        <a href="<?php echo esc_url(home_url('/')); ?>"<?php echo is_front_page() ? ' aria-current="page"' : ''; ?>>Veículos</a>
        <a href="<?php echo esc_url(vj_url_rubens()); ?>" class="menu__rubens"<?php echo vj_eh_pagina_rubens() ? ' aria-current="page"' : ''; ?>><img src="<?php echo esc_url(vj_asset('rubens/avatar.jpg')); ?>" alt="" width="26" height="26" /><span class="menu__longo">Quem é o </span>Rubens</a>
      </nav>
      <div class="topo__dir">
        <?php if (is_front_page()) : ?>
          <p class="topo__meta" id="meta">Carregando anúncios…</p>
        <?php endif; ?>
        <?php if ($insta) : ?>
          <a class="insta" href="<?php echo esc_url('https://www.instagram.com/' . $insta . '/'); ?>" target="_blank" rel="noopener" aria-label="<?php echo esc_attr('Instagram do Rubens (@' . $insta . ')'); ?>" title="<?php echo esc_attr('@' . $insta); ?>">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1.1" class="insta__ponto" /></svg>
            <span><?php echo esc_html('@' . $insta); ?></span>
          </a>
        <?php endif; ?>
        <?php if (is_front_page()) : ?>
          <div class="conta" id="conta"></div>
        <?php else : ?>
          <a class="btn btn--wpp btn--peq js-wpp" target="_blank" rel="noopener" href="<?php echo esc_url(vj_link_whats('Olá ' . $vj['nome_contato'] . '! Vi o site ' . VJ_MARCA . ' e gostaria de uma consultoria para arrematar um veículo em leilão judicial.')); ?>">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm5.9 15.7c-.3-.2-1.9-1-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c0-.2-.3-.3-.7-.5Z"/></svg>
            <span>Falar com o <?php echo esc_html($vj['nome_contato']); ?></span>
          </a>
        <?php endif; ?>
      </div>
    </div>
  </header>
