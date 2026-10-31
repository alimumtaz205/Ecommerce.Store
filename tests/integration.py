#!/usr/bin/env python3
"""DISPOSABLE LINUX QA ONLY. Starts its OWN empty MySQL on loopback3399, two APIs and SSR.
Requires NUTRAGEA_QA_RUNTIME_ROOT containing mysql/, dotnet/, optional libs/;
NUTRAGEA_QA_TRACKER_ROOT points to original BatchTracker source root.
Never points at your configured existing database. Uses ephemeral random keys/admin.
Requires installed frontend npm dependencies and a completed production build.
Synthetic records and policies must never be deployed. Python standard library only.
"""
import os,subprocess,tempfile,time,pathlib,urllib.request,urllib.error,json,uuid,base64,secrets,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1]; STORE=ROOT; QA=pathlib.Path(os.environ['NUTRAGEA_QA_RUNTIME_ROOT']); tmp=pathlib.Path(tempfile.mkdtemp(prefix='nutragea-commerce-qa-')); procs=[];checks=0
env=os.environ.copy();env['LD_LIBRARY_PATH']=str(QA/'libs/usr/lib/x86_64-linux-gnu')+':'+str(QA/'mysql/lib/private'); env.update({'ASPNETCORE_ENVIRONMENT':'Development','ConnectionStrings__MySql':'Server=127.0.0.1;Port=3399;Database=nutragea;User ID=root;SSL Mode=None;Allow User Variables=true','Jwt__Issuer':'Nutragea.BatchTracker','Jwt__Audience':'Nutragea.Staff','Jwt__SigningKeyBase64':base64.b64encode(secrets.token_bytes(64)).decode(),'Jwt__EncryptionKeyBase64':base64.b64encode(secrets.token_bytes(32)).decode(),'NUTRAGEA_ADMIN_USERNAME':'testadmin','NUTRAGEA_ADMIN_PASSWORD':secrets.token_urlsafe(24),'Commerce__DataDirectory':str(tmp/'data'),'Commerce__PublicOrigin':'http://localhost:4399'})
dotnet=str(QA/'dotnet/dotnet');legacy=pathlib.Path(os.environ['NUTRAGEA_QA_TRACKER_ROOT'])/'src/Nutragea.Api';api=STORE/'backend/Nutragea.Commerce.Api'
def run(cmd,cwd=ROOT):
 p=subprocess.run(cmd,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 if p.returncode:raise Exception(p.stdout[-5000:])
 return p.stdout
def spawn(cmd,cwd,name):
 f=open(tmp/(name+'.log'),'w');p=subprocess.Popen(cmd,cwd=cwd,env=env,stdout=f,stderr=f);procs.append(p);return p

def req(method,path,body=None,token=None,status=200,port=5292,raw=None,ctype='application/json'):
 global checks
 data=raw if raw is not None else json.dumps(body).encode() if body is not None else None
 headers={'Content-Type':ctype}
 if token:headers['Authorization']='Bearer '+token
 try:
  with urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}'+path,data=data,headers=headers,method=method),timeout=30) as r:code=r.status;response=r.read();content=r.headers.get('Content-Type','')
 except urllib.error.HTTPError as e:code=e.code;response=e.read();content=e.headers.get('Content-Type','')
 assert code==status,(method,path,code,status,response[:1500])
 checks+=1
 return json.loads(response) if 'json' in content and response else response

def wait(port,path='/health/live'):
 for i in range(100):
  try:req('GET',path,port=port);return
  except Exception:time.sleep(.15)
 raise Exception('Startup failed '+str(port))
try:
 dat=tmp/'mysql';run([str(QA/'mysql/bin/mysqld'),'--no-defaults','--initialize-insecure','--user=root',f'--basedir={QA}/mysql',f'--datadir={dat}'])
 spawn([str(QA/'mysql/bin/mysqld'),'--no-defaults','--user=root',f'--basedir={QA}/mysql',f'--datadir={dat}','--port=3399','--bind-address=127.0.0.1','--socket=','--mysqlx=OFF'],ROOT,'mysql')
 for i in range(100):
  try:run([str(QA/'mysql/bin/mysql'),'--no-defaults','-h127.0.0.1','-P3399','-uroot','-e','CREATE DATABASE IF NOT EXISTS nutragea']);break
  except Exception:time.sleep(.15)
 run([dotnet,'build','--no-restore','--nologo'],legacy);run([dotnet,'bin/Debug/net10.0/Nutragea.Api.dll','--migrate','--bootstrap-admin'],legacy)
 run([dotnet,'build','--no-restore','--nologo'],api);run([dotnet,'bin/Debug/net10.0/Nutragea.Commerce.Api.dll','--migrate'],api)
 run([dotnet,'bin/Debug/net10.0/Nutragea.Commerce.Api.dll','--seed-demo'],api)
 run([dotnet,'bin/Debug/net10.0/Nutragea.Commerce.Api.dll','--seed-demo'],api)
 spawn([dotnet,'bin/Debug/net10.0/Nutragea.Api.dll','--urls','http://127.0.0.1:5291'],legacy,'legacy');spawn([dotnet,'bin/Debug/net10.0/Nutragea.Commerce.Api.dll','--urls','http://127.0.0.1:5292'],api,'commerce');wait(5291);wait(5292)
 def old(method,path,body=None,status=200):return req(method,'/api'+path,body,token,status,5291)
 token=req('POST','/api/auth/login',{'username':'testadmin','password':env['NUTRAGEA_ADMIN_PASSWORD']},port=5291)['accessToken'];assert len(token.split('.'))==5
 def admin(method,path,body=None,status=200):return req(method,'/capi/admin'+path,body,token,status)
 req('GET','/capi/admin/settings',status=401)
 demos=req('GET','/capi/products?featured=true')['items'];assert len(demos)==3 and all('(Demo)' in x['name'] for x in demos)
 assert all(v['available']==0 for x in demos for v in req('GET','/capi/products/'+x['slug'])['variants'])
 assert len(admin('GET','/media')['items'])==1

 grow=old('POST','/growers',{'name':'QA synthetic','village':'QA','district':'QA'},201)['id'];fresh=old('POST','/products',{'name':'QA fresh','stage':'Fresh'},201)['id'];dry=old('POST','/products',{'name':'QA dried','stage':'Dried','sourceProductId':fresh},201)['id']
 import datetime
 now=datetime.datetime.now(datetime.timezone.utc)
 receipt=old('POST','/receipts',{'growerId':grow,'receivedAt':now.isoformat(),'supplierReference':'QA','items':[{'productId':fresh,'receivedKg':100,'acceptedKg':100,'rejectedKg':0,'purchaseAmount':100}]},201)['id'];old('POST',f'/receipts/{receipt}/post');item=old('GET',f'/receipts/{receipt}')['items'][0]['id'];batch=old('POST','/batches',{'processType':'QA','inputs':[{'receiptItemId':item,'quantityKg':100}]},201)['id'];old('POST',f'/batches/{batch}/start');old('POST',f'/batches/{batch}/complete',{'outputProductId':dry,'outputKg':20,'processReductionKg':80,'rejectedKg':0,'notes':'Synthetic QA'});old('POST',f'/batches/{batch}/checks',{'checkType':'QA','result':'Synthetic only'},201);old('PUT',f'/batches/{batch}/quality',{'disposition':'Released','reason':'Synthetic QA only'})
 lot=old('POST','/lots',{'requestId':str(uuid.uuid4()),'batchId':batch,'netWeightKg':.25,'packCount':60,'lossKg':0,'packedOn':now.date().isoformat(),'bestBefore':(now.date()+datetime.timedelta(days=30)).isoformat()},201)['id']
 boundary='NutrageaQA'+uuid.uuid4().hex;parts=[]
 for key,value in {'alt':'QA fixture','rightsConfirmed':'true','consentConfirmed':'false','isDocumentary':'false'}.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
 parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="qa.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+(STORE/'frontend/public/assets/nutragea-logo-original.png').read_bytes()+b'\r\n');parts.append(f'--{boundary}--\r\n'.encode());media=req('POST','/capi/admin/media',token=token,status=201,raw=b''.join(parts),ctype='multipart/form-data; boundary='+boundary)['id']
 m=next(x for x in admin('GET','/media')['items'] if x['id']==media);req('GET','/capi/media/'+m['file_name'],status=404)
 prod={'name':'QA dried apricot','slug':'qa-apricot','categoryId':1,'operationalProductId':dry,'summary':'Synthetic test only','description':'Synthetic test product','origin':'QA','ingredients':'QA','allergens':'QA','storage':'QA','imageIds':[media],'published':True,'featured':True};product=admin('POST','/products',prod,201)['id'];variant=admin('POST','/variants',{'productId':product,'label':'250 g','sku':'QA-250','price':500,'netWeightKg':.25,'isActive':True},201)['id'];allocation=admin('POST','/allocations',{'variantId':variant,'lotId':lot,'quantity':40},201)['id'];req('GET','/capi/media/'+m['file_name']);assert old('GET','/reports/stock')['packs'][0]['available_packs']==20
 for policy in [x for x in admin('GET','/content')['items'] if x['type']=='Policy']:
  admin('PUT','/content/'+str(policy['id']),{'type':'Policy','slug':policy['slug'],'title':policy['title'],'summary':'QA policy only','body':'Synthetic QA policy only; never deploy this text.','programmeStatus':'Planned','imageIds':[],'published':True,'version':policy['version']})
 shipping=admin('POST','/shipping',{'name':'QA PK','countryCode':'PK','charge':250,'isActive':True},201)['id'];settings=admin('GET','/settings');admin('PUT','/settings',{'checkoutEnabled':True,'codEnabled':True,'supportEmail':'qa@example.invalid','companyAddress':'QA address only','version':settings['version']});assert req('GET','/capi/settings')['checkoutAvailable']
 catalog=req('GET','/capi/products?featured=true');assert catalog['items'][0]['id']==product and 'operational_product_id' not in catalog['items'][0]
 q=req('POST','/capi/quote',{'items':[{'variantId':variant,'quantity':2}],'shippingId':shipping});assert q['total']==1250
 body={'requestId':str(uuid.uuid4()),'items':[{'variantId':variant,'quantity':2}],'shippingId':shipping,'name':'QA Buyer','email':'qa@example.invalid','phone':'03001234567','address':'QA address','city':'QA city','postalCode':'12345','countryCode':'PK','expectedTotal':q['total'],'acceptTerms':True,'expectedPolicyRevision':q['policyRevision']}
 order=req('POST','/capi/orders',body,status=201);repeat=req('POST','/capi/orders',body,status=201);assert repeat['accessCode']==order['accessCode'];req('POST','/capi/orders',dict(body,name='Changed'),status=409);req('POST','/capi/orders/lookup',{'reference':order['reference'],'accessCode':'0'*64},status=404);lookup=req('POST','/capi/orders/lookup',{'reference':order['reference'],'accessCode':order['accessCode']});assert lookup['order']['total']==1250
 oid=admin('GET','/orders')['items'][0]['id'];admin('POST',f'/orders/{oid}/actions',{'action':'Confirm','reason':'QA'});old('PUT',f'/batches/{batch}/quality',{'disposition':'OnHold','reason':'QA hold'});admin('POST',f'/orders/{oid}/actions',{'action':'Ship','reason':'QA'},409);old('PUT',f'/batches/{batch}/quality',{'disposition':'Released','reason':'QA release'});admin('POST',f'/orders/{oid}/actions',{'action':'Ship','reason':'QA'});admin('POST',f'/orders/{oid}/actions',{'action':'Ship','reason':'QA'},409);admin('POST',f'/orders/{oid}/actions',{'action':'Deliver','reason':'QA'});assert admin('GET',f'/orders/{oid}')['order']['payment_status']=='Collected'
 def neworder(qty):
  b=dict(body,requestId=str(uuid.uuid4()),items=[{'variantId':variant,'quantity':qty}],expectedTotal=500*qty+250)
  return req('POST','/capi/orders',b,status=201)
 neworder(2);cancelid=admin('GET','/orders')['items'][0]['id'];admin('POST',f'/orders/{cancelid}/actions',{'action':'Cancel','reason':'QA'});assert admin('GET','/allocations')['items'][0]['reserved']==0
 neworder(2);expireid=admin('GET','/orders')['items'][0]['id'];run([str(QA/'mysql/bin/mysql'),'--no-defaults','-h127.0.0.1','-P3399','-uroot','nutragea','-e',f'UPDATE s_orders SET expires_at=UTC_TIMESTAMP()-INTERVAL 1 MINUTE WHERE id={expireid}']);admin('POST','/orders/expire');assert admin('GET',f'/orders/{expireid}')['order']['status']=='Expired'
 admin('POST',f'/allocations/{allocation}/release',{'quantity':8});assert old('GET','/reports/stock')['packs'][0]['available_packs']==28
 def compete(_):
  try:neworder(20);return 201
  except AssertionError as e:
   if e.args[0][2]==409:return 409
   raise
 with concurrent.futures.ThreadPoolExecutor(2) as pool:assert sorted(pool.map(compete,[1,2]))==[201,409]
 req('POST','/capi/enquiries',{'type':'Contact','name':'QA','email':'qa@example.invalid','message':'Test only'},status=201);req('POST','/capi/enquiries',{'type':'Wholesale','name':'QA','email':'qa@example.invalid','message':'Missing fields'},status=400)
 # Publication, stale edits, policy/price acceptance and role boundaries.
 admin('PUT','/products/'+str(product),dict(prod,version=0),409)
 admin('PUT','/products/'+str(product),dict(prod,version=1,published=False));req('GET','/capi/products/qa-apricot',status=404);req('GET','/capi/media/'+m['file_name'],status=404)
 admin('PUT','/products/'+str(product),dict(prod,version=2))
 req('POST','/capi/orders',dict(body,requestId=str(uuid.uuid4()),expectedTotal=1),status=409)
 req('POST','/capi/orders',dict(body,requestId=str(uuid.uuid4()),expectedPolicyRevision='0'*64),status=409)
 admin('POST','/content',{'type':'Story','slug':'qa-not-documentary','title':'QA','summary':'QA','body':'QA','programmeStatus':'Planned','imageIds':[media],'published':True},400)
 opPass=secrets.token_urlsafe(24);old('POST','/users',{'username':'qaoperator','password':opPass,'role':'Operator'},201)
 op=req('POST','/capi/auth/login',{'username':'qaoperator','password':opPass})['accessToken'];req('GET','/capi/admin/orders',token=op,status=403)
 badparts=b''.join(parts).replace((STORE/'frontend/public/assets/nutragea-logo-original.png').read_bytes(),b'<svg onload="alert(1)"/>')
 req('POST','/capi/admin/media',token=token,status=400,raw=badparts,ctype='multipart/form-data; boundary='+boundary)
 # Real SSR and same-origin proxy, using the live disposable API.
 env['SSR_API_ORIGIN']='http://127.0.0.1:5292';env['PORT']='4399';env['PUBLIC_ORIGIN']='http://127.0.0.1:4399';spawn(['node','dist/nutragea/server/server.mjs'],STORE/'frontend','ssr');wait(4399,'/about');html=req('GET','/shop/qa-apricot',port=4399).decode();assert 'QA dried apricot' in html and 'application/ld+json' in html and 'token_hash' not in html
 req('GET','/capi/products',port=4399);assert b'qa-apricot' in req('GET','/sitemap.xml',port=4399)
 result=f'PASS: {checks} HTTP checks plus stock totals, idempotency, private lookup, quality hold, ship/deliver, cancellation, expiry, concurrent oversell protection, real SSR, proxy and sitemap assertions.';print(result);(STORE/'tests/last-integration-result.txt').write_text(result+'\nSynthetic data used only in a disposable local database.\n')
except Exception:
 for name in ['commerce','legacy','ssr','mysql']:
  p=tmp/(name+'.log')
  if p.exists():print(name,p.read_text()[-3500:])
 raise
finally:
 for p in reversed(procs):p.terminate()
 for p in reversed(procs):
  try:p.wait(timeout=10)
  except: p.kill()
