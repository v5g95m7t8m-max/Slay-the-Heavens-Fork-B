# Windows 托管检出：Release 归档字节调查

[Release Windows 6/18](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45090287098/job/137418357139) 在测试前共接收 **144,881,002 B**，超过 128 MiB 上限 **10,663,274 B**。[Develop Windows 6/18](https://github.com/FurinyaWorks/Slay-the-Heavens/actions/runs/45051445258/job/137301632813) 对照为 **132,120,698 B**，通过字节门槛，随后作业取消。两条都使用 Git for Windows 2.56.1；不是同一提交或同一服务端协商。

Release 现有树中六个不在 Develop 对照树中的历史 gzip blob 合计 **18,767,343 B**。在 Linux Git 2.56.1 中，使用这六个精确 blob 构造并逐对象验证 pack：压缩 6 为 **18,577,971 B**，压缩 9 为 **18,577,969 B**，仅省 2 B。见 `measurements.json`；可用 `bash probe.sh /path/to/checkout` 复现。旧归档的 Git blob、内容及门禁均未改变。

这是六对象子集实验，不是 GitHub 服务端的整包归因，也不能直接从托管总量减去该值。现在不能通过重新压缩这一组解决缺口。若继续调整取件流程，应先证明完整测试文件、历史认证、精确 HEAD/BASE、同一包体预算和 LFS/媒体校验均保留，再进行一条托管作业验证。没有提高上限、删快照、跳过测试或重跑 Full。
