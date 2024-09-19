import LIMITS from './limits.js';
import { setLibs, isOldBrowser } from '../../scripts/utils.js';
import verbAnalytics from '../../scripts/alloy/verb-widget.js';

const miloLibs = setLibs('/libs');
const { createTag } = await import(`${miloLibs}/utils/utils.js`);

const EOLBrowserPage = 'https://acrobat.adobe.com/home/index-browser-eol.html';

const setUser = () => {
  localStorage.setItem('unity.user', 'true');
};

const handleError = (err, errTxt, str, strTwo) => {
  err.classList.add('verb-error');
  err.classList.remove('hide');
  errTxt.textContent = `${window.mph[str]} ${strTwo || ''}`;

  setTimeout(() => {
    err.classList.remove('verb-error');
    err.classList.add('hide');
  }, 5000);
};

const setDraggingClass = (widget, shouldToggle) => {
  // eslint-disable-next-line chai-friendly/no-unused-expressions
  shouldToggle ? widget.classList.add('dragging') : widget.classList.remove('dragging');
};

export default async function init(element) {
  if (isOldBrowser()) {
    window.location.href = EOLBrowserPage;
    return;
  }
  const children = element.querySelectorAll(':scope > div');
  const VERB = element.classList[1];
  const widgetHeading = createTag('h1', { class: 'verb-heading' }, children[0].textContent);
  let mobileLink = null;
  if (/iPad|iPhone|iPod/.test(window.browser?.ua) && !window.MSStream) {
    mobileLink = window.mph[`verb-widget-${VERB}-apple`];
  } else if (/android/i.test(window.browser?.ua)) {
    mobileLink = window.mph[`verb-widget-${VERB}-google`];
  }

  children.forEach((child) => {
    child.remove();
  });

  const widget = createTag('div', { id: 'drop-zone', class: 'verb-wrapper' });
  const widgetContainer = createTag('div', { class: 'verb-container' });
  const widgetRow = createTag('div', { class: 'verb-row' });
  const widgetLeft = createTag('div', { class: 'verb-col' });
  const widgetRight = createTag('div', { class: 'verb-col right' });
  const widgetHeader = createTag('div', { class: 'verb-header' });
  const widgetIcon = createTag('div', { class: 'verb-icon' });
  const widgetTitle = createTag('div', { class: 'verb-title' }, 'Acrobat');
  const widgetCopy = createTag('p', { class: 'verb-copy' }, window.mph[`verb-widget-${VERB}-description`]);
  const widgetButton = createTag('label', { for: 'file-upload', class: 'verb-cta' }, window.mph['verb-widget-cta']);
  const widgetMobileButton = createTag('a', { class: 'verb-mobile-cta', href: mobileLink }, window.mph['verb-widget-cta-mobile']);
  const button = createTag('input', { type: 'file', id: 'file-upload', class: 'hide' });
  const widgetImage = createTag('img', { class: 'verb-image', src: children[1].querySelector('img')?.src });
  // Since we're using placeholders we need a solution for the hyperlinks
  const legal = createTag('p', { class: 'verb-legal' }, window.mph['verb-widget-legal']);
  const iconSecurity = createTag('div', { class: 'security-icon' });
  const footer = createTag('div', { class: 'verb-footer' });

  const errorState = createTag('div', { class: 'hide' });
  const errorStateText = createTag('p', { class: 'verb-errorText' });
  const errorIcon = createTag('div', { class: 'verb-errorIcon' });
  const errorCloseBtn = createTag('div', { class: 'verb-errorBtn' });

  widget.append(widgetContainer);
  widgetContainer.append(widgetRow);
  widgetRight.append(widgetImage);
  widgetRow.append(widgetLeft, widgetRight);
  widgetHeader.append(widgetIcon, widgetTitle);
  errorState.append(errorIcon, errorStateText, errorCloseBtn);
  if (mobileLink && LIMITS[VERB].mobileApp) {
    widgetLeft.append(widgetHeader, widgetHeading, widgetCopy, errorState, widgetMobileButton);
  } else {
    widgetLeft.append(widgetHeader, widgetHeading, widgetCopy, errorState, widgetButton, button);
  }
  footer.append(iconSecurity, legal);

  element.append(widget, footer);

  // Analytics
  verbAnalytics('landing:shown', VERB);

  widgetMobileButton.addEventListener('click', () => {
    verbAnalytics('goto-app:clicked', VERB);
  });

  button.addEventListener('click', () => {
    verbAnalytics('filepicker:shown', VERB);
  });

  button.addEventListener('cancel', () => {
    verbAnalytics('choose-file:close', VERB);
  });

  widget.addEventListener('dragover', (e) => {
    e.preventDefault();
    setDraggingClass(widget, true);
  });

  widget.addEventListener('dragleave', () => {
    setDraggingClass(widget, false);
  });

  errorCloseBtn.addEventListener('click', () => {
    errorState.classList.remove('verb-error');
    errorState.classList.add('hide');
  });

  window.addEventListener('unity:track-analytics', (e) => {
    if (e.detail?.event === 'change') {
      verbAnalytics('choose-file:open', VERB);
      setUser();
    }
    // maybe new event name files-dropped?
    if (e.detail?.event === 'drop') {
      verbAnalytics('files-dropped', VERB, e.detail?.data);
      setDraggingClass(widget, false);
      setUser();
    }
    if (e.detail?.event === 'choose-file-clicked') {
      verbAnalytics('dropzone:choose-file-clicked', VERB, e.detail?.data);
      setUser();
    }

    if (e.detail?.event === 'uploading') {
      verbAnalytics('job:uploading', VERB, e.detail?.data);
      setUser();
    }

    if (e.detail?.event === 'uploaded') {
      verbAnalytics('job:uploaded', VERB, e.detail?.data);
      setUser();
    }
  });

  // Errors, Analytics & Logging
  window.addEventListener('unity:show-error-toast', (e) => {
    console.log(`⛔️ Error Code - ${e.detail?.code}`);

    if (e.detail?.code === 'only_accept_one_file') {
      handleError(errorState, errorStateText, 'verb-widget-error-multi');
      verbAnalytics('error', VERB);
    }

    if (e.detail?.code === 'unsupported_type') {
      handleError(errorState, errorStateText, 'verb-widget-error-unsupported');
      verbAnalytics('error:unsupported_type', VERB);
    }

    if (e.detail?.code === 'empty_file') {
      handleError(errorState, errorStateText, 'verb-widget-error-empty');
      verbAnalytics('error:empty_file', VERB);
    }

    // Code may be wrong. should be 'file_too_large'
    if (e.detail?.code === 'file_too_largempty_file') {
      handleError(errorState, errorStateText, 'verb-widget-error-large', LIMITS[VERB].maxFileSizeFriendly);
      verbAnalytics('error', VERB);
    }

    if (e.detail?.code === 'max_page_count') {
      handleError(errorState, errorStateText, 'verb-widget-error-max', LIMITS[VERB].maxNumFiles);
      verbAnalytics('error:max_page_count', VERB);
    }

    // acrobat:verb-fillsign:error:page_count_missing_from_metadata_api
    // acrobat:verb-fillsign:error:403
    // acrobat:verb-fillsign:error
    // LANA for 403
  });
}

// const ce = (new CustomEvent('unity:show-error-toast', { detail: { code: 'only_accept_one_file', message: 'Error message' } }));
// dispatchEvent(ce)
