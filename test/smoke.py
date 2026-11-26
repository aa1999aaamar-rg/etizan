
import asyncio,sys,json
from playwright.async_api import async_playwright
B=sys.argv[1];OUT=sys.argv[2]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,locale='ar-SA',timezone_id='Asia/Riyadh',is_mobile=True,has_touch=True,geolocation={'latitude':24.7136,'longitude':46.6753},permissions=['geolocation'])
    pg=await ctx.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append('PE '+str(e)));pg.on('console',lambda m:errs.append('C '+m.text) if m.type=='error' else None)
    await pg.goto(B+'/');await pg.wait_for_timeout(1500)
    await pg.screenshot(path=OUT+'/s0.png')
    await pg.click('text=استخدم موقعي الحالي');await pg.wait_for_timeout(1500)
    for r in ['home','schedule','tasks','prayer','phone','more','sleep','health','learn','habits','reports','settings']:
      await pg.evaluate(f"location.hash='#/{r}'");await pg.wait_for_timeout(700)
      await pg.screenshot(path=f'{OUT}/m-{r}.png',full_page=(r=='home'))
    print(json.dumps(errs,ensure_ascii=False))
    await b.close()
asyncio.run(main())
