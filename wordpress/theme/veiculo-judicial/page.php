<?php
/* Páginas de texto (termos de uso, política de privacidade…). */
if (!defined('ABSPATH')) exit;
get_header();
?>
<main class="wrap pagina-texto">
  <?php while (have_posts()) : the_post(); ?>
    <h1><?php the_title(); ?></h1>
    <div class="conteudo"><?php the_content(); ?></div>
  <?php endwhile; ?>
</main>
<?php get_footer();
