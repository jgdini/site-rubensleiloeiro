<?php if (!defined('ABSPATH')) exit; ?>
  <footer class="rodape">
    <div class="wrap">
      <p><b><?php echo esc_html(VJ_MARCA); ?></b> reúne anúncios publicados por leiloeiros oficiais em leilões judiciais, com curadoria e assessoria jurídica do Dr. Rubens Filippe de Jesus. Lances, pagamentos, editais e condições são de responsabilidade exclusiva do leiloeiro. Valores e datas podem mudar — sempre confira no anúncio original antes de dar um lance.</p>
      <p class="rodape__fontes" id="rodape-fontes"></p>
      <nav class="rodape__explorar" aria-label="Explorar">
        <a href="<?php echo esc_url(vj_seo_url('hub')); ?>">Leilão judicial de veículos</a>
        <?php foreach (vj_seo_tipos() as $t => $info) : if (empty(vj_seo_contagens()['tipo'][$t])) continue; ?>
          <a href="<?php echo esc_url(vj_seo_url('tipo', $t)); ?>"><?php echo esc_html($info['nome']); ?></a>
        <?php endforeach; ?>
        <a href="<?php echo esc_url(vj_seo_url('guia')); ?>">Como comprar em leilão judicial</a>
        <a href="<?php echo esc_url(vj_url_rubens()); ?>">Quem é o Rubens</a>
      </nav>
      <?php
      $links = [];
      foreach (['termos-de-uso' => 'Termos de uso', 'politica-de-privacidade' => 'Política de privacidade'] as $slug => $rotulo) {
          $p = get_page_by_path($slug);
          if ($p && $p->post_status === 'publish') $links[] = '<a href="' . esc_url(get_permalink($p)) . '">' . esc_html($rotulo) . '</a>';
      }
      if ($links) echo '<p class="rodape__fontes">' . implode(' · ', $links) . '</p>';
      ?>
    </div>
  </footer>
<?php wp_footer(); ?>
</body>
</html>
