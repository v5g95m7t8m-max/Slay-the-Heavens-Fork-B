# PR688 冷检出父层接续

本切片仅接续既有 `f03605d69b0943139a2d1f015edd953cb9958089` 的完整来源无损压缩，不新增存储读取器、不修改生产、脚本、测试、旧归档、比较输入或 128 MiB 门槛。当前 Release 比较基线为 `af77fb2461c548f0faf104761d107397f75dca08`。

## 失败与根因

Fork A Full `44114037126` 的 Windows 18 片均在 pack 门禁失败。`rules (1/18)` / job `134147873007` 的真实日志：depth2、blob:none、精确 HEAD f036；准备完整父及 Release 比较输入后 9,781 个对象、26 个新增对象 / 2,157,301 字节，全部 pack 总计 **135,484,524 > 134,217,728** 字节。

f036 已把完整来源 packet 从 1,674,363 压到 1,024,975 字节，但其直接父 `a87a2d376572f58691c0973c49569a5691b5a5b9` 仍含旧 packet。真实 depth2 与完整父比较必须保留旧对象，不能只测当前树或 depth1。空库从 GitHub 重新检出 f036，并以同一选择器完整补齐父及 af77 的非媒体对象后，全部保留 pack 为 **135,484,843** 字节，原门禁实际拒绝。两次结果受实际 pack 编码影响略异，均超限。

## 最小接续与保全

本证据提交以 f036 为唯一父，让原流程自然不再需要祖父 a87 的独有旧压缩对象。保留 depth2、完整直接父/Release BASE、全部 pack 计数及原预算；不删除 pack、不重包、不改变 fetch 或断言。当前源码和旧归档与 f036 逐 Git blob 保持相同，a87 与更早完整历史仍可恢复。

已对比 #699 `8d4e5c4a690ef8ccec4f4914e7ebe063523a0d96` 的有界无损存储方案；该方案明确要求迁移后的后继提交实测真实父层。PR688 已有完整 record Brotli 存储，继续引入 #699 的 252 成员读取器会增加不必要范围，故复用其取证方法。

## 验证边界

原完整来源测试 `forward Release union authenticates every live production owner and retains both complete reviewed corpora and producers` 1/1 通过，覆盖当前 462 个文件及 126 个前驱归档。首次因本地两个既有 LFS helper 尚为 pointer 而拒绝，原失败保留；从现有已认证本地 LFS 缓存按 SHA256 还原后通过，未改断言，验证后恢复 Git pointer。`check:guidance` 通过。

本提交后另在空库以精确新 HEAD、depth2、blob:none 和完整 af77 比较执行原 pack 门禁；结果单独交接，不能在提交前预报成功。未推送、未触发 Full、未合并，没有官方/设备验证；Release 四项 Required、Strict、无 Queue 的保护不变，TASK-4.21 手机 AC 保持未验。

`manifest.json` 绑定原日志与无损 gzip 身份。托管日志为 GitHub connector 返回的完整已解码文本，保留其 BOM/CRLF；本地日志不冒充托管日志。初次直接认证比较读取受环境阻断，随后对同一空库使用公开读取完成完全相同的非媒体对象集合，未清理任何 pack。
