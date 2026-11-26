
import asyncio,sys
from playwright.async_api import async_playwright
B=sys.argv[1]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=await b.new_context(viewport={'width':360,'height':780},locale='ar-SA',timezone_id='Asia/Riyadh',permissions=['notifications'])
    pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(B+'/');await pg.wait_for_timeout(1500);await pg.locator('.sheet [data-ci]').first.click();await pg.wait_for_timeout(500)
    await pg.evaluate("location.hash='#/settings'");await pg.wait_for_timeout(500)
    await pg.click('[data-non]');await pg.wait_for_timeout(800)
    print('notif on',await pg.evaluate('S.settings.notif.on'))
    await pg.click('[data-ntest]');await pg.wait_for_timeout(1500)
    print('toast',await pg.locator('.toast').inner_text() if await pg.locator('.toast').count() else None)
    for r in ['home','schedule','tasks','prayer','phone','sleep','health','learn','habits','reports','settings']:
      await pg.evaluate(f"location.hash='#/{r}'");await pg.wait_for_timeout(400)
      sw=await pg.evaluate('document.documentElement.scrollWidth');
      if sw>360: print('overflow',r,sw)
    print('errs',errs);await b.close()
asyncio.run(main())
