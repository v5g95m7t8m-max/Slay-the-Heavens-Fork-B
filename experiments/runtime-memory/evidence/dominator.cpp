#include <algorithm>
#include <cassert>
#include <cstdint>
#include <cstring>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <numeric>
#include <queue>
#include <string>
#include <unordered_map>
#include <vector>
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
using namespace std;
using U=uint32_t;
const char* p;
U next(){while (*p<'0'||*p>'9')++p;U x=0;while(*p>='0'&&*p<='9')x=10*x+(*p++-'0');return x;}
void field(const char* n){p=strstr(p,n);assert(p);p+=strlen(n);}
int main(int argc,char**argv){
 int fd=open(argv[1],O_RDONLY);assert(fd>=0);struct stat st;fstat(fd,&st); const char* root=(const char*)mmap(nullptr,st.st_size,PROT_READ,MAP_PRIVATE,fd,0); p=root;
 field("\"node_count\":"); U N=next();
 field("\"edge_count\":"); U E=next();
 field("\"nodes\":[");
 vector<U> name(N), self(N), id(N), degree(N), offset(N+1);
 vector<uint8_t> kind(N);
 uint64_t all=0;
 for(U i=0;i<N;i++){kind[i]=next();name[i]=next();id[i]=next();self[i]=next();all+=self[i];degree[i]=next();next();}
 field("\"edges\":["); vector<U> edges,labels;vector<uint8_t> ek;edges.reserve(E);labels.reserve(E);ek.reserve(E);vector<U> indeg(N+1);
 for(U i=0;i<N;i++){offset[i]=edges.size();for(U j=0;j<degree[i];j++){U type=next(),label=next(),dst=next()/6;assert(dst<N);
  if(type!=6){edges.push_back(dst);labels.push_back(label);ek.push_back(type);++indeg[dst+1];}
 }} offset[N]=edges.size();
 degree.clear();degree.shrink_to_fit();field("\"strings\":["); vector<string> names;
 while(true){while(*p && *p!='"' && *p!=']') ++p; if(*p==']')break;++p;const char* start=p;while(*p!='"'){if(*p=='\\')++p;++p;}names.emplace_back(start,p);++p;}
 auto nm=[&](U i)->const string&{return names[name[i]];};
 cerr<<"Read graph "<<N<<" nodes "<<edges.size()<<" strong edges "<<names.size()<<" strings."<<endl;
 vector<U> dfs(N),vertex(N+1),parent(N+1),stack; U count=1; dfs[0]=count;vertex[count]=0;stack.push_back(offset[0]);
 while(!stack.empty()){U& cur=stack.back();U v=vertex[parent[0]]; (void)v;
  // Parent for the current stack entry stored in separate node stack below.
  break;
 } stack.clear();
 vector<U> nodes{0};stack.push_back(offset[0]);
 while(!nodes.empty()){U u=nodes.back(); auto& j=stack.back(); if(j==offset[u+1]){nodes.pop_back();stack.pop_back();continue;}
  U v=edges[j++]; if(dfs[v])continue;dfs[v]=++count;vertex[count]=v;parent[count]=dfs[u];nodes.push_back(v);stack.push_back(offset[v]);}
 for(U i=1;i<=N;i++)indeg[i]+=indeg[i-1];
 vector<U> incoming(edges.size()),nextIn=indeg;
 for(U u=0;u<N;u++)if(dfs[u])for(U j=offset[u];j<offset[u+1];j++)incoming[nextIn[edges[j]]++]=dfs[u];
 nextIn.clear();nextIn.shrink_to_fit();
 vector<U> semi(count+1),anc(count+1),label(count+1),dom(count+1),first(count+1),nxt(count+1),trail;
 iota(semi.begin(),semi.end(),0);iota(label.begin(),label.end(),0);
 auto eval=[&](U v){if(!anc[v])return label[v];trail.clear();U x=v;
  while(anc[anc[x]]){trail.push_back(x);x=anc[x];}
  while(!trail.empty()){x=trail.back();trail.pop_back();U a=anc[x];if(semi[label[a]]<semi[label[x]])label[x]=label[a];anc[x]=anc[a];}return label[v];};
 for(U w=count;w>=2;w--){U v=vertex[w];for(U j=indeg[v];j<indeg[v+1];j++)if(incoming[j])semi[w]=min(semi[w],semi[eval(incoming[j])]);
  nxt[w]=first[semi[w]];first[semi[w]]=w;U pw=parent[w];anc[w]=pw;
  for(U t=first[pw];t;t=nxt[t]){U u=eval(t);dom[t]=semi[u]<semi[t]?u:pw;}first[pw]=0;}
 for(U i=2;i<=count;i++)if(dom[i]!=semi[i])dom[i]=dom[dom[i]];
 vector<uint64_t> retained(count+1);uint64_t reachable=0;
 for(U i=1;i<=count;i++){retained[i]=self[vertex[i]];reachable+=retained[i];}
 for(U i=count;i>=2;--i)retained[dom[i]]+=retained[i];
 printf("Total graph nodes=%u reachable=%u strongEdges=%zu sum_all_self=%llu sum_reachable_self=%llu\n",N,count,edges.size(),(unsigned long long)all,(unsigned long long)reachable);
 unordered_map<string,pair<uint64_t,uint64_t>> typ; // shallow bytes and objects
 vector<U> rank,rankAll;
 for(U i=1;i<=count;i++){U v=vertex[i];auto& t=typ[to_string(kind[v])+" "+nm(v)];t.first+=self[v]; t.second++;
  if(kind[v]!=9 && retained[i]>=(2<<20)){rankAll.push_back(i);if(kind[v]==3)rank.push_back(i);}}
 vector<pair<string,pair<uint64_t,uint64_t>>> groups(typ.begin(),typ.end());sort(groups.begin(),groups.end(),[](auto&a,auto&b){return a.second.first>b.second.first;});
 for(int i=0;i<18&&i<(int)groups.size();i++)printf("SHALLOW %llu %llu %.130s\n",(unsigned long long)groups[i].second.first,(unsigned long long)groups[i].second.second,groups[i].first.c_str());
 auto show=[&](vector<U>&r,int k){sort(r.begin(),r.end(),[&](U a,U b){return retained[a]>retained[b];});U end=min(U(k),U(r.size()));
  for(U j=0;j<end;j++){U i=r[j],v=vertex[i]; printf("DOM @%u retained=%llu shallow=%u type=%u %.160s PATH",id[v],(unsigned long long)retained[i],self[v],kind[v],nm(v).c_str());
   for(U at=i,l=0;at&&l<18;at=dom[at],l++)printf(" <- @%u:%.100s",id[vertex[at]],nm(vertex[at]).c_str());puts("");}
 };
 show(rankAll,16);show(rank,12);
 // BFS paths include direct retaining edges, not just the dominator chain.
 vector<U> pp(N,UINT32_MAX), ee(N);queue<U> q;pp[0]=0;q.push(0);
 while(!q.empty()){U u=q.front();q.pop();for(U j=offset[u];j<offset[u+1];j++){U v=edges[j];if(pp[v]!=UINT32_MAX)continue;pp[v]=u;ee[v]=j;q.push(v);}}
 for(U l=0;l<min(U(7),U(rank.size()));l++){U v=vertex[rank[l]];printf("STRONG_PATH @%u %.100s",id[v],nm(v).c_str());
   for(U j=0;v&&j<30;++j){U e=ee[v],s=pp[v];if(ek[e]==1||ek[e]==4)printf(" <- %u [%u] @%u:%.80s",ek[e],labels[e],id[s],nm(s).c_str());else printf(" <- %u %.100s @%u:%.80s",ek[e],names[labels[e]].c_str(),id[s],nm(s).c_str());v=s;}puts("");}
}
