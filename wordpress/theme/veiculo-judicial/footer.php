<?php if (!defined('ABSPATH')) exit; ?>
  <footer class="rodape">
    <div class="wrap">
      <p><b><?php echo esc_html(VJ_MARCA); ?></b> reúne anúncios publicados por leiloeiros oficiais em leilões judiciais, com curadoria e assessoria jurídica do Dr. Rubens Filippe de Jesus. Lances, pagamentos, editais e condições são de responsabilidade exclusiva do leiloeiro. Valores e datas podem mudar — sempre confira no anúncio original antes de dar um lance.</p>
      <p class="rodape__fontes" id="rodape-fontes"></p>
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
