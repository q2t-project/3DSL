// Native keyboard input, including pages with JavaScript disabled. This checks
// site navigation, not screen-reader output or every control inside the Viewer.
import assert from 'node:assert/strict';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';

const server = await serveBuild();
let count = 0;
try {
  for (const width of [320, 360, 1280]) {
    await withBrowser(async ({ cmd, evaluate }) => {
      await cmd('Network.enable');
      await cmd('Network.setBlockedURLs', { urlPatterns: [
        { urlPattern: server.origin + '/*', block: false },
        { urlPattern: 'http://*:*/*', block: true }, { urlPattern: 'https://*:*/*', block: true },
      ] });
      await cmd('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: false });
      async function key(key, code, windowsVirtualKeyCode) {
        await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode });
        await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
      }
      for (const javaScript of [true, false]) {
        await cmd('Emulation.setScriptExecutionDisabled', { value: !javaScript });
        for (const route of ['/library/', '/docs/works/knowledge-questions/', '/contact/']) {
          const label = `${route} ${width}px JS=${javaScript}`;
          await cmd('Page.navigate', { url: server.origin + route });
          await waitFor(() => evaluate('location.pathname===' + JSON.stringify(route) + ' && document.readyState==="complete" && !!document.querySelector(".ui-skip-link")'), label);
          // A narrow layout with doubled root text exercises reflow. This is
          // not an assertion about OS text scaling or browser zoom settings.
          if (width === 320) await evaluate('document.documentElement.style.fontSize="200%"');
          assert(await evaluate('(() => {const b=document.querySelector(".ui-skip-link").getBoundingClientRect();return b.bottom<=0;})()'), label + ': link does not cover the initial page');
          await key('Tab', 'Tab', 9);
          await waitFor(() => evaluate('document.activeElement?.classList.contains("ui-skip-link")'), label + ': first Tab');
          assert(await evaluate('(() => {const b=document.activeElement.getBoundingClientRect();return b.left>=0&&b.top>=0&&b.right<=innerWidth&&b.bottom<=innerHeight;})()'), label + ': focused link is visible');
          await key('Enter', 'Enter', 13);
          await waitFor(() => evaluate('document.activeElement?.id==="main-content"'), label + ': Enter moves focus to content');
          const content = await evaluate('(() => {const h=document.querySelector("main h1").getBoundingClientRect(),n=document.querySelector("header").getBoundingClientRect();return {heading:h.top,header:n.bottom,width:innerWidth,scroll:document.documentElement.scrollWidth};})()');
          assert(content.heading >= content.header - 1, label + ': heading is below sticky header ' + JSON.stringify(content));
          assert(content.scroll <= content.width + 1, label + ': no page-wide horizontal overflow ' + JSON.stringify(content));
          await key('Tab', 'Tab', 9);
          await waitFor(() => evaluate('!!document.activeElement?.closest("main") && document.activeElement.id!=="main-content"'), label + ': next Tab continues in content');
          const outline = await evaluate('(() => {const s=getComputedStyle(document.activeElement);return {style:s.outlineStyle,width:s.outlineWidth,color:s.outlineColor};})()');
          assert.equal(outline.style, 'solid', label + ': visible focus');
          assert.equal(outline.width, '2px', label + ': focus outline');
          assert.notEqual(outline.color, 'rgba(0, 0, 0, 0)', label + ': nontransparent outline');
          count++;
        }
      }
    });
  }
  console.log(`[check:keyboard-reading] PASS ${count} routes: native Tab/Enter, content focus, next Tab, visible outline, sticky header and reflow; JS on/off; 320px at 200% root text.`);
} finally { await server.close(); }
