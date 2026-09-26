<?php
/* Fallback obrigatório do WordPress (a home usa front-page.php). */
if (!defined('ABSPATH')) exit;
get_header();
?>
<main class="wrap pagina-texto">
  <?php if (have_posts()) : while (have_posts()) : the_post(); ?>
    <h1><?php the_title(); ?></h1>
    <div class="conteudo"><?php the_content(); ?></div>
  <?php endwhile; else : ?>
    <h1>Página não encontrada</h1>
    <div class="conteudo"><p><a href="<?php echo esc_url(home_url('/')); ?>">Voltar para os veículos em leilão</a></p></div>
  <?php endif; ?>
</main>
<?php get_footer();
