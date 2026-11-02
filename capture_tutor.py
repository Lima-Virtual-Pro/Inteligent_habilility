from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844})
 page.evaluate("() => { const map = new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}}) }")
 page.set_content((root/'Inteligent_Hability_V3_5_Standalone.html').read_text(),wait_until='load')
 page.locator('#modo-temporario').click()
 page.locator('#faixa').select_option('11-12')
 page.locator('[data-view="tutor"]').click()
 page.locator('#tutor-area').select_option('matematica')
 page.locator('#ai35-criar').click()
 page.screenshot(path=str(root/'qa'/'tutor_390.png'),full_page=True)
 print('Tutor capturado:',root/'qa'/'tutor_390.png')
 browser.close()
