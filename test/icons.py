
import asyncio,sys
from playwright.async_api import async_playwright
from PIL import Image
S=sys.argv[1]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':512,'height':512})
    for n in ['icon','maskable']:
      await pg.goto(f'http://127.0.0.1:8765/_{n}.html');await pg.wait_for_timeout(600)
      await pg.screenshot(path=f'{S}/icons/{n}-512.png',clip={'x':0,'y':0,'width':512,'height':512})
    await b.close()
  im=Image.open(f'{S}/icons/icon-512.png').convert('RGB')
  im.resize((192,192),Image.LANCZOS).save(f'{S}/icons/icon-192.png')
  im.resize((180,180),Image.LANCZOS).save(f'{S}/icons/apple-touch-icon.png')
asyncio.run(main())
