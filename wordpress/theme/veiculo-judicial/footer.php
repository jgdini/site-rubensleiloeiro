<?php if (!defined('ABSPATH')) exit; ?>
  <footer class="rodape">
    <div class="wrap">
      <p><b><?php echo esc_html(VJ_MARCA); ?></b> é uma ferramenta de busca: reúne anúncios de leilões judiciais publicados por leiloeiros oficiais em seus próprios sites. Não somos leiloeiros, não vendemos os veículos e não participamos dos leilões. Fotos, descrições, valores, datas, editais e condições são de responsabilidade exclusiva de cada leiloeiro, e o <?php echo esc_html(VJ_MARCA); ?> não se responsabiliza por divergências, pelo resultado dos leilões nem por negociações com terceiros. Confira sempre o anúncio original e o edital antes de dar um lance.</p>
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
      <p class="rodape__copy">&copy; <?php echo date('Y'); ?> Rubens Felippe &mdash; Desenvolvido por <a class="rodape__halo-credit" href="https://jgdini.github.io/halo-company/" target="_blank" rel="noopener"><svg class="rodape__halo-sym" viewBox="0 0 32 32" width="20" height="20" aria-hidden="true"><g transform="rotate(-90 16 16)" fill="none" stroke-width="3.2" stroke-linecap="round"><circle cx="16" cy="16" r="11" pathLength="300" stroke="#E0506F" stroke-dasharray="86 214"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="#E7C493" stroke-dasharray="86 214" stroke-dashoffset="-100"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="#F8F3EB" stroke-dasharray="86 214" stroke-dashoffset="-200"/></g></svg><span>halo <small>company</small></span></a></p>
    </div>
  </footer>
<?php if (is_user_logged_in()) get_template_part('inc/popup-intro'); ?>
<?php wp_footer(); ?>
</body>
</html>
