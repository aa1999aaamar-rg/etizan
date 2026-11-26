
import asyncio,sys,json,os
from playwright.async_api import async_playwright
B=sys.argv[1];OUT=sys.argv[2];os.makedirs(OUT,exist_ok=True)
res=[]
def ok(n,c,i=''):
  res.append((n,bool(c)));print(('PASS ' if c else 'FAIL ')+n+('' if c else ' -> '+str(i)),flush=True)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,locale='ar-SA',timezone_id='Asia/Riyadh',is_mobile=True,has_touch=True,accept_downloads=True)
    pg=await ctx.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append('PE '+str(e)));pg.on('console',lambda m:errs.append('C '+m.text) if m.type=='error' else None)
    W=pg.wait_for_timeout
    async def go(h): await pg.evaluate(f"location.hash='#/{h}'");await W(500)
    async def fill(name,v): await pg.locator(f'.sheet [name="{name}"]').first.fill(str(v))
    async def save(): await pg.locator('.sheet button[type=submit]').click();await W(400)
    S=lambda js:pg.evaluate('()=>'+js)
    await pg.goto(B+'/');await W(1500)
    ok('location sheet on first run',await pg.locator('.sheet >> text=استخدم موقعي الحالي').count())
    await pg.locator('.sheet [data-q]').fill('جدة');await pg.locator('.sheet [data-ci]:visible').first.click();await W(500)
    ok('city chosen -> prayer countdown',await S("S.settings.loc&&S.settings.loc.name")=='جدة' and await pg.locator('[data-np]').count())
    ok('schedule seeded (11 blocks)',await S("S.schedule.normal.length")==11)
    ok('footer credit',await pg.locator('text=صُنع بواسطة').count())
    # task add via FAB
    await pg.click('#fab');await W(300);await pg.locator('.sheet [data-qa=task]').click();await W(300)
    await fill('title','تحويل مبلغ للمورد');await pg.locator('.sheet [name=cat]').select_option('father');await pg.locator('.sheet [name=kind]').select_option('transfer');await fill('amount','1500');await save()
    ok('task added',await S("S.tasks.length")==1)
    await go('tasks');ok('task listed',await pg.locator('text=تحويل مبلغ للمورد').count())
    await pg.locator('[data-tedit]').first.click();await W(300);await fill('title','تحويل مبلغ للمورد أحمد');await save()
    ok('task edited',await S("S.tasks[0].title")=='تحويل مبلغ للمورد أحمد')
    await pg.locator('[data-tchk]').first.click();await W(300);ok('task done',await S("S.tasks[0].done"))
    # second task then delete
    await pg.click('[data-nt]');await W(300);await fill('title','واجب الرياضيات');await save()
    await pg.click('[data-tf=all]');await W(300)
    await pg.locator('[data-tedit]',has_text='واجب الرياضيات').click();await W(300);await pg.click('.sheet [data-del]');await W(300);await pg.click('.sheet [data-y]');await W(400)
    ok('task deleted',await S("S.tasks.length")==1)
    # project + subtask
    await pg.click('[data-newp]');await W(300);await fill('title','مشروع العلوم');await save()
    await pg.locator('[data-pst]').first.click();await W(300);await fill('title','جمع المصادر');await save()
    ok('project subtask',await S("S.tasks.some(t=>t.projectId&&t.title=='جمع المصادر')"))
    # emergency task
    await pg.click('#fab');await W(300);await pg.locator('.sheet [data-qa=em]').click();await W(300);await fill('title','إصلاح طارئ');await save()
    ok('emergency task',await S("S.tasks.some(t=>t.em)"))
    # schedule block add/edit/delete
    await go('schedule');await pg.click('[data-addb]');await W(300);await fill('title','مراجعة الفيزياء')
    await pg.locator('.sheet .tspec[data-k=start] [data-time]').fill('16:00');await pg.locator('.sheet .tspec[data-k=end] [data-time]').fill('16:45');await save()
    ok('block added',await pg.locator('.blk',has_text='مراجعة الفيزياء').count())
    await pg.locator('[data-bedit]',has_text='مراجعة الفيزياء').click();await W(300);await fill('title','مراجعة الكيمياء');await save()
    ok('block edited',await pg.locator('.blk',has_text='مراجعة الكيمياء').count())
    await pg.locator('[data-bedit]',has_text='مراجعة الكيمياء').click();await W(300);await pg.click('.sheet [data-del]');await W(300);await pg.click('.sheet [data-y]');await W(400)
    ok('block deleted',await S("S.events.length")==0)
    ok('emergency shown in schedule',await pg.locator('text=المهام الطارئة').count())
    # edit base block time anchored to prayer
    await pg.locator('[data-bedit]',has_text='القرآن والمراجعة').click();await W(300);await pg.locator('.sheet .tspec[data-k=start] [data-time]').fill('15:10');await save()
    ok('base block edited',await S("(S.schedule.normal.find(b=>b.title=='القرآن والمراجعة')||S.schedule.holiday.find(b=>b.title=='القرآن والمراجعة')).start")=='15:10')
    # drag reorder
    before=await S("blocksFor(todayK()).filter(b=>b.src=='base').map(b=>b.title)")
    hs=pg.locator('.blk [data-h]');h1=await hs.nth(2).bounding_box();h2=await hs.nth(4).bounding_box()
    await pg.mouse.move(h1['x']+5,h1['y']+5);await pg.mouse.down();
    for i in range(1,16): await pg.mouse.move(h1['x']+5,h1['y']+5+(h2['y']-h1['y']+20)*i/15);await W(20)
    await pg.mouse.up();await W(500)
    after=await S("blocksFor(todayK()).filter(b=>b.src=='base').map(b=>b.title)")
    ok('drag reorder changed order',before!=after,str(before[:5])+' / '+str(after[:5]))
    await pg.click('[data-hol]');await W(300);ok('holiday toggle',await S("!!S.overrides[todayK()]"))
    await pg.click('[data-hol]');await W(300)
    await pg.click('[data-sv=week]');await W(300);ok('week view',await pg.locator('.wk .col').count()==7)
    await pg.screenshot(path=OUT+'/week.png')
    await pg.click('[data-sv=month]');await W(300);ok('month view',await pg.locator('.mo .d').count()==42)
    await pg.screenshot(path=OUT+'/month.png')
    await pg.click('[data-sv=day]');await W(300)
    # habit
    await go('habits');await pg.click('[data-nh]');await W(300);await fill('title','قراءة ١٠ صفحات');await save()
    await pg.locator('[data-hd]').first.click();await W(300);ok('habit added + checked',await S("Object.keys(S.habits[0].log).length")==1)
    await pg.locator('[data-he]').first.click();await W(300);await fill('title','قراءة ١٥ صفحة');await save();ok('habit edited',await S("S.habits[0].title")=='قراءة ١٥ صفحة')
    await pg.click('[data-hg=goals]');await W(300);await pg.click('[data-ng]');await W(300);await fill('title','إنهاء الواجبات');await save()
    await pg.locator('[data-gchk]').first.click();await W(300);ok('goal done -> achievement',await S("S.achievements.length")>=1)
    # sleep
    await pg.click('#fab');await W(300);await pg.locator('.sheet [data-qa=sleep]').click();await W(300);await fill('bed','22:45');await fill('wake','04:30');await fill('nap','60');await save()
    ok('sleep logged',await S("totalSleep(todayK())")==405)
    # weight
    await pg.click('#fab');await W(300);await pg.locator('.sheet [data-qa=weight]').click();await W(300);await fill('kg','68.5');await save()
    ok('weight logged',await S("S.weight.length")==1)
    # screen time
    await go('phone');await pg.click('[data-scr]');await W(300);await fill('th','3');await fill('tm','20');await pg.locator('.sheet [data-aq="يوتيوب"]').click();await W(200)
    await pg.locator('.sheet [data-am]').last.fill('90');await save()
    ok('screen time saved',await S("phoneMins(todayK())")==200)
    await pg.click('[data-bath="1"]');await W(300);ok('bath counter',await S("S.days[todayK()].phone.bath")==1)
    await pg.locator('[data-entgo="15"]').click();await W(1200);ok('ent timer running',await pg.locator('[data-ent]').count())
    await pg.click('[data-entstop]');await W(300);ok('ent session logged',await S("S.days[todayK()].phone.sessions.length")==1)
    # prayer
    await go('home');await pg.locator('[data-pr=fajr]').first.click();await W(300);ok('prayer checked',await S("S.days[todayK()].pr.fajr")==1)
    await pg.locator('[data-pr=fajr]').first.click();await W(300);ok('prayer jamaa',await S("S.days[todayK()].pr.fajr")==2)
    await pg.screenshot(path=OUT+'/home-data.png',full_page=True)
    # quran
    await go('prayer');await pg.click('[data-qt=quran]');await W(300);await pg.click('[data-ql=new]');await W(300)
    await pg.locator('.sheet [name=s]').select_option('67');await fill('a1','1');await fill('a2','10');await save()
    ok('quran log',await S("S.qlogs.length")==1 and await pg.locator('text=الملك').count())
    await pg.click('[data-qt=adhkar]');await W(300);await pg.locator('[data-azall]').click();await W(300);ok('adhkar done',await S("Object.values(S.days[todayK()].az).includes(true)"))
    # simple mode
    await go('home');await pg.click('[data-simple]');await W(300);ok('simple mode top3',await pg.locator('.tk3 .it').count()<=3 and await pg.locator('text=الوضع البسيط').count())
    await pg.screenshot(path=OUT+'/simple.png');await pg.click('[data-simple]');await W(300)
    # reports
    await go('reports');ok('reports chart rendered',await pg.locator('svg.chart').count()>=2)
    for r in ['home','schedule','prayer','phone','sleep','health','habits','reports','tasks','learn','settings']:
      await go(r);await W(400);await pg.screenshot(path=OUT+f'/cap-{r}.png')
    await go('prayer');await pg.click('[data-qt=quran]');await W(300);await pg.screenshot(path=OUT+'/cap-quran.png')
    await pg.click('[data-qt=adhkar]');await W(300);await pg.screenshot(path=OUT+'/cap-adhkar.png')
    await go('home');await pg.click('#fab');await W(400);await pg.screenshot(path=OUT+'/cap-fab.png');await pg.click('.sheet [data-x]');await W(200)
    # backup export/import
    await go('settings')
    async with pg.expect_download() as dl: await pg.click('[data-exp]')
    d=await dl.value;path=OUT+'/backup.json';await d.save_as(path)
    j=json.load(open(path));ok('export file has data',len(j['state']['tasks'])==len(await S('S.tasks')))
    ntasks=len(j['state']['tasks'])
    await pg.click('[data-wipe]');await W(300);await pg.click('.sheet [data-y]');await W(500);ok('wiped',await S("S.tasks.length")==0)
    await pg.locator('[data-imp]').set_input_files(path);await W(500);await pg.click('.sheet [data-y]');await W(700)
    ok('import restored',await S("S.tasks.length")==ntasks and await S("S.weight.length")==1)
    # cloud backup round-trip
    await go('settings');await pg.click('[data-con]');await W(4000)
    code=await S("S.cloud&&S.cloud.code");ok('cloud backup enabled',bool(code) and await S("!!S.cloud.last"),code)
    await pg.click('[data-wipe]');await W(300);await pg.click('.sheet [data-y]');await W(600)
    await go('settings');await pg.click('[data-crest]');await W(300);await fill('code',code.lower().replace('-',''));await save();await W(4000)
    await pg.click('.sheet [data-y]');await W(800)
    ok('cloud restore',await S("S.tasks.length")==ntasks and await S("S.cloud&&S.cloud.code")==code)
    await pg.screenshot(path=OUT+'/cap-cloud.png')
    # persistence reload
    await pg.reload();await W(1500);ok('persisted after reload',await S("S.tasks.length")==ntasks)
    # offline
    await W(1000);await ctx.set_offline(True);await pg.reload();await W(1500)
    ok('offline reload works',await pg.locator('.nav').count() and await S("S.tasks.length")==ntasks)
    await ctx.set_offline(False)
    ok('no console errors',not errs,errs)
    # desktop
    ctx2=await b.new_context(viewport={'width':1280,'height':800},locale='ar-SA',timezone_id='Asia/Riyadh')
    p2=await ctx2.new_page();e2=[];p2.on('pageerror',lambda e:e2.append(str(e)))
    await p2.goto(B+'/');await p2.wait_for_timeout(1200);await p2.evaluate("localStorage.clear()")
    await p2.locator('.sheet [data-ci]').first.click();await p2.wait_for_timeout(500)
    ok('desktop sidebar',await p2.locator('.side').is_visible() and not await p2.locator('.nav').is_visible())
    await p2.screenshot(path=OUT+'/desk-home.png')
    await p2.click('.sl[data-r=schedule]');await p2.wait_for_timeout(500);await p2.screenshot(path=OUT+'/desk-schedule.png')
    ok('desktop no errors',not e2,e2)
    print('SUMMARY',sum(1 for r in res if r[1]),'/',len(res))
    await b.close()
asyncio.run(main())
