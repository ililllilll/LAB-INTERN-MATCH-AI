(function () {
  'use strict';

  const CONSENT_KEY = 'labmatch_analytics_consent_v1';
  const SCRIPT_ID = 'lm-goatcounter-script';
  const currentScript = document.currentScript;
  const privacyUrl = currentScript ? new URL('privacy.html', currentScript.src).href : 'privacy.html';
  const dataPolicyUrl = currentScript ? new URL('data-policy.html', currentScript.src).href : 'data-policy.html';

  function getChoice() {
    try { return localStorage.getItem(CONSENT_KEY) || 'unset'; }
    catch (_) { return 'unset'; }
  }

  function setChoice(value) {
    try { localStorage.setItem(CONSENT_KEY, value); }
    catch (_) { /* 선택 저장이 불가능하면 현재 페이지에만 적용 */ }
  }

  function hasConsent() {
    return getChoice() === 'granted';
  }

  function loadAnalytics() {
    if (!hasConsent() || document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = 'https://gc.zgo.at/count.js';
    script.setAttribute('data-goatcounter', 'https://dgist-intern-match.goatcounter.com/count');
    document.head.appendChild(script);
    window.dispatchEvent(new CustomEvent('lm-analytics-consent-granted'));
  }

  function removeBanner() {
    const banner = document.getElementById('lm-consent-banner');
    if (banner) banner.remove();
  }

  function applyChoice(value) {
    setChoice(value);
    removeBanner();
    if (value === 'granted') loadAnalytics();
    window.dispatchEvent(new CustomEvent('lm-analytics-consent-changed', { detail: { value } }));
  }

  function ensureStyles() {
    if (document.getElementById('lm-consent-styles')) return;
    const style = document.createElement('style');
    style.id = 'lm-consent-styles';
    style.textContent = `
      .lm-consent-banner{position:fixed;left:14px;right:14px;bottom:14px;z-index:2147483000;max-width:760px;margin:0 auto;padding:15px 16px;border:1px solid #d9e1ef;border-radius:16px;background:rgba(255,255,255,.98);color:#26334a;box-shadow:0 14px 44px rgba(18,32,64,.20);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,sans-serif}
      .lm-consent-text{margin:0;font-size:13px;line-height:1.62;word-break:keep-all}
      .lm-consent-text strong{color:#14213d}
      .lm-consent-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:11px}
      .lm-consent-btn{min-height:40px;padding:9px 13px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#26334a;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
      .lm-consent-btn.primary{border-color:#1f6f5f;background:#1f6f5f;color:#fff}
      .lm-consent-link{color:#3151a3;font-size:12px;font-weight:750;text-decoration:underline;text-underline-offset:2px}
      .lm-privacy-footer{margin:22px auto 8px;padding:0 14px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,sans-serif;font-size:11px;line-height:1.6;color:#667085}
      .lm-privacy-footer a,.lm-privacy-footer button{color:#52627a;background:none;border:0;padding:0;font:inherit;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
      .lm-data-notice{max-width:980px;margin:22px auto 6px;padding:14px 16px;border:1px solid #dfe6ef;border-radius:14px;background:#f8fafc;color:#52627a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",Arial,sans-serif;font-size:12px;line-height:1.7;word-break:keep-all}
      .lm-data-notice strong{color:#344054}.lm-data-notice a{color:#3151a3;font-weight:800;text-decoration:underline;text-underline-offset:2px}
      @media(max-width:560px){.lm-consent-banner{left:10px;right:10px;bottom:10px;padding:14px}.lm-consent-actions{display:grid;grid-template-columns:1fr 1fr}.lm-consent-btn{width:100%}.lm-consent-link{grid-column:1/-1;text-align:center;padding-top:3px}}
    `;
    document.head.appendChild(style);
  }

  function showBanner() {
    if (document.getElementById('lm-consent-banner')) return;
    ensureStyles();
    const banner = document.createElement('section');
    banner.id = 'lm-consent-banner';
    banner.className = 'lm-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', '이용 통계 선택');
    banner.innerHTML = `
      <p class="lm-consent-text"><strong>이용 통계 안내</strong><br>서비스 개선을 위해 페이지 조회, 버튼 클릭, 학교 및 서비스 선택, 검색 결과 수 구간, 만족도 응답을 집계합니다. 검색어 원문, 이름, 학번, 이메일, 사용자 ID는 저장하지 않으며, 거부해도 모든 기능을 이용할 수 있습니다.</p>
      <div class="lm-consent-actions">
        <button type="button" class="lm-consent-btn primary" data-lm-consent="granted">동의</button>
        <button type="button" class="lm-consent-btn" data-lm-consent="denied">거부</button>
        <a class="lm-consent-link" href="${privacyUrl}">자세한 이용 통계 안내</a>
      </div>`;
    banner.addEventListener('click', function (event) {
      const button = event.target.closest('[data-lm-consent]');
      if (button) applyChoice(button.dataset.lmConsent);
    });
    document.body.appendChild(banner);
  }

  function isGraduateLabPage() {
    return /\/graduate\/(dgist|snu|kaist|postech)\/?(?:index\.html)?$/.test(window.location.pathname);
  }

  function addDataNotice() {
    if (!isGraduateLabPage() || document.getElementById('lm-data-notice')) return;
    ensureStyles();
    const notice = document.createElement('section');
    notice.id = 'lm-data-notice';
    notice.className = 'lm-data-notice';
    notice.innerHTML = `<strong>교수 및 연구실 정보 안내</strong><br>공식 대학, 학과 및 연구실 홈페이지에 공개된 직무 정보를 탐색 편의를 위해 구조화한 비공식 참고 서비스입니다. 검색 결과 순서는 입력 키워드와 공개 연구 분야의 관련도이며, 교수님이나 연구실의 우수성을 평가하는 순위가 아닙니다. 최신 정보는 공식 홈페이지에서 확인해 주세요. <a href="${dataPolicyUrl}">데이터 출처 및 정정·삭제 안내</a>`;
    document.body.appendChild(notice);
  }

  function addFooterControls() {
    if (document.getElementById('lm-privacy-footer')) return;
    ensureStyles();
    const footer = document.createElement('div');
    footer.id = 'lm-privacy-footer';
    footer.className = 'lm-privacy-footer';
    footer.innerHTML = `<a href="${privacyUrl}">이용 통계 안내</a> · <a href="${dataPolicyUrl}">교수·연구실 데이터 안내</a> · <button type="button" data-lm-open-consent>이용 통계 설정</button>`;
    footer.querySelector('[data-lm-open-consent]').addEventListener('click', showBanner);
    document.body.appendChild(footer);
  }

  window.LMAnalyticsConsent = {
    hasConsent,
    getChoice,
    setChoice: applyChoice,
    open: showBanner,
    privacyUrl,
    dataPolicyUrl
  };

  function init() {
    addDataNotice();
    addFooterControls();
    const choice = getChoice();
    if (choice === 'granted') loadAnalytics();
    else if (choice === 'unset') showBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
