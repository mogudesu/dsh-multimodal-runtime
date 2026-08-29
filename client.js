window.__ModuleLoader__.load({
    id: "dsh-multimodal-runtime",
    factory: (require) => {
        const bundleModule = { exports: {} };
        Object.defineProperty(bundleModule.exports, Symbol.toStringTag, { value: "Module" });
        // 束契约：本文件由宿主以 /plugins/dsh-multimodal-runtime/client.js 提供，
        // 只能 require 外壳种子词（react、jsx-runtime）。
        let react_jsx_runtime = require("react/jsx-runtime");
        let react = require("react");
        // ── 样式 ─────────────────────────────────────────────────────────────
        const css = ".MMR_section{position:relative;width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}.MMR_headRow{align-items:center;gap:10px;display:flex}.MMR_title{font-size:13px;font-weight:600;line-height:20px;margin:0}.MMR_provider{align-items:center;gap:6px;margin-left:auto;color:var(--dsw-alias-label-tertiary);font-size:12px;display:inline-flex}.MMR_dot{border-radius:999px;width:7px;height:7px;background:var(--dsw-alias-label-tertiar);background:var(--dsw-alias-label-tertiary)}.MMR_dot[data-on=true]{background:var(--dsw-alias-state-success-primary)}.MMR_refreshBtn{font:inherit;cursor:pointer;background:0 0;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);border-radius:6px;padding:4px 12px;font-size:12px}.MMR_refreshBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.MMR_status{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;margin:0}.MMR_failure{color:var(--dsw-alias-state-error-primary);font-size:13px;display:flex;align-items:center;gap:10px}.MMR_group{flex-direction:column;gap:8px;display:flex}.MMR_groupTitle{align-items:baseline;gap:8px;padding:0 2px;display:flex}.MMR_groupTitle h4{font-size:13px;font-weight:600;line-height:20px;margin:0}.MMR_groupTitle span{color:var(--dsw-alias-label-tertiary);font-size:11px}.MMR_cards{flex-direction:column;gap:8px;display:flex}.MMR_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:10px 12px;flex-direction:column;gap:10px;display:flex}.MMR_card[data-off=true]{opacity:.55}.MMR_cardHead{align-items:center;gap:8px;display:flex}.MMR_name{font-size:13px;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.MMR_idTag{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-1);border-radius:5px;padding:1px 6px;font-size:11px;white-space:nowrap}.MMR_starBtn{cursor:pointer;border:none;background:0 0;color:var(--dsw-alias-label-tertiary);font-size:15px;line-height:1;padding:2px 4px}.MMR_starBtn[data-on=true]{color:var(--dsw-alias-state-business-primary)}.MMR_switchRow{margin-left:auto;align-items:center;gap:6px;display:inline-flex}.MMR_switch{position:relative;cursor:pointer;border:none;width:34px;height:20px;border-radius:10px;background:var(--dsw-alias-border-l2);transition:background .2s ease;padding:0}.MMR_switch[data-on=true]{background:var(--dsw-alias-state-business-primary)}.MMR_switchThumb{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s ease}.MMR_switch[data-on=true] .MMR_switchThumb{left:16px}.MMR_switchText{color:var(--dsw-alias-label-tertiary);font-size:12px;white-space:nowrap}.MMR_grid{grid-template-columns:1fr 1fr;gap:8px 10px;display:grid}.MMR_field{flex-direction:column;gap:4px;display:flex;min-width:0}.MMR_label{color:var(--dsw-alias-label-tertiary);font-size:11px}.MMR_select,.MMR_input{box-sizing:border-box;width:100%;height:30px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;padding:0 8px;outline:0}.MMR_select:focus-visible,.MMR_input:focus-visible{border-color:var(--dsw-alias-state-business-primary)}.MMR_numRow{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;display:grid}.MMR_footRow{align-items:center;gap:10px;display:flex}.MMR_saveBtn{font:inherit;cursor:pointer;border:1px solid transparent;background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-on-primary,#fff);border-radius:6px;padding:5px 14px;font-size:12px}.MMR_saveBtn:disabled{opacity:.6;cursor:default}.MMR_drop{border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:16px 12px;text-align:center;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:12px}.MMR_drop[data-over=true]{border-color:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.MMR_prog{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;flex:1}.MMR_progBar{height:100%;border-radius:999px;background:var(--dsw-alias-state-success-primary);transition:width .4s}.MMR_stepRow{display:flex;align-items:center;gap:8px;font-size:12px;line-height:20px}.MMR_outImg{max-width:100%;max-height:240px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2)}.MMR_outRow{display:flex;align-items:center;gap:10px;font-size:12px}.MMR_badge{border-radius:5px;padding:1px 6px;font-size:11px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);white-space:nowrap}.MMR_badge[data-state=running]{color:var(--dsw-alias-label-primary)}.MMR_badge[data-state=failed]{color:var(--dsw-alias-state-error-primary)}.MMR_badge[data-state=done]{color:var(--dsw-alias-state-success-primary)}.MMR_hint{color:var(--dsw-alias-label-tertiary);font-size:12px}.MMR_hint[data-ok=true]{color:var(--dsw-alias-state-success-primary)}.MMR_hint[data-ok=false]{color:var(--dsw-alias-state-error-primary)}.MMR_cmenuWrap{position:relative;display:inline-flex}.MMR_cmenuBtn{font:inherit;cursor:pointer;background:0 0;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);border-radius:6px;padding:3px 8px;font-size:12px;display:inline-flex;align-items:center;gap:4px}.MMR_cmenuBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.MMR_cmenuBackdrop{position:fixed;inset:0;z-index:29}.MMR_cmenuPop{position:absolute;bottom:calc(100% + 6px);left:0;z-index:30;min-width:132px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.25);flex-direction:column;display:flex}.MMR_cmenuItem{font:inherit;cursor:pointer;background:0 0;border:none;color:var(--dsw-alias-label-primary);border-radius:6px;padding:6px 10px;font-size:12px;text-align:left;white-space:nowrap}.MMR_cmenuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.MMR_chipRow{box-sizing:border-box;width:100%;max-width:var(--dsh-composer-card-max-width,780px);margin:0 auto 6px;padding:0 4px;align-items:center;gap:8px;flex-wrap:wrap;display:flex}.MMR_chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:999px;padding:3px 10px;font-size:12px;color:var(--dsw-alias-label-primary)}.MMR_chipX{cursor:pointer;border:none;background:0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;padding:0 2px;line-height:1}.MMR_chipX:hover{color:var(--dsw-alias-state-error-primary)}.MMR_chipSel{font:inherit;max-width:240px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:6px;padding:3px 6px;font-size:12px}.MMR_chipLabel{color:var(--dsw-alias-label-tertiary);font-size:12px}.MMR_subLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:600;margin-top:2px}.MMR_famList{max-height:340px;overflow-y:auto;flex-direction:column;gap:6px;display:flex}.MMR_famCard{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:6px 8px;flex-direction:column;gap:4px;display:flex}.MMR_famHead{align-items:center;gap:6px;flex-wrap:wrap;display:flex}.MMR_famName{font-size:12px;font-weight:600;word-break:break-all;max-width:280px}.MMR_famTag{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-3);border-radius:4px;padding:0 5px;font-size:10px;white-space:nowrap}.MMR_epRow{align-items:center;gap:8px;font-size:11px;border-top:1px solid var(--dsw-alias-border-l2);padding:3px 0;display:flex}.MMR_epPath{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}.MMR_epName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}.MMR_epAdd{font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:0 0;color:var(--dsw-alias-label-primary);border-radius:5px;padding:1px 9px;font-size:11px;flex:0 0 auto}.MMR_epAdd:hover{background:var(--dsw-alias-interactive-bg-hover)}.MMR_provCard{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);padding:8px 10px;flex-direction:column;gap:6px;display:flex}.MMR_provTop{align-items:center;gap:8px;flex-wrap:wrap;display:flex}.MMR_provDesc{color:var(--dsw-alias-label-tertiary);font-size:11px}.MMR_genWrap{flex-direction:column;gap:8px;display:flex;width:100%;max-width:760px}.MMR_genCard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:10px 12px;flex-direction:column;gap:8px;display:flex}.MMR_genHead{align-items:center;gap:8px;display:flex}.MMR_genTitle{font-size:12px;font-weight:600}.MMR_genCard{border:1px solid rgba(255,255,255,0.09);background:linear-gradient(180deg,#1c1e29 0%,#13141d 100%);border-radius:14px;padding:12px 14px;flex-direction:column;gap:10px;display:flex;box-shadow:0 8px 24px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.06);backdrop-filter:blur(20px);position:relative;box-sizing:border-box;width:100%;transition:all .2s ease}.MMR_genHead{align-items:center;gap:10px;display:flex;min-width:0;width:100%;padding-bottom:2px}.MMR_genTag{flex:none;font-size:11px;font-weight:600;color:#93c5fd;border:1px solid rgba(59,130,246,0.32);background:rgba(59,130,246,0.12);border-radius:999px;padding:2px 9px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 4px rgba(59,130,246,0.15)}.MMR_genPrompt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:rgba(255,255,255,0.72);font-weight:400;letter-spacing:.2px}.MMR_genClose{flex:none;font:inherit;cursor:pointer;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.55);width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:all .15s ease;padding:0}.MMR_genClose:hover{color:#fff;background:var(--dsw-alias-state-error-primary);border-color:transparent;transform:scale(1.06)}.MMR_genCardMediaWrap{display:flex;flex-direction:column;gap:10px;width:100%;min-width:0}.MMR_genMedia{position:relative;width:100%;border-radius:12px;overflow:hidden;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.1);cursor:pointer;transition:border-color .2s ease}.MMR_genMedia:hover{border-color:rgba(59,130,246,0.4)}.MMR_genImg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;cursor:zoom-in;transition:transform .3s cubic-bezier(0.4,0,0.2,1)}.MMR_genMedia:hover .MMR_genImg{transform:scale(1.015)}.MMR_genActions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:2px;width:100%}.MMR_actionBtn{font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.8);border-radius:999px;padding:4.5px 12px;font-size:11.5px;font-weight:500;line-height:16px;transition:all .18s cubic-bezier(0.4,0,0.2,1);backdrop-filter:blur(8px)}.MMR_actionBtn:hover{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.22);color:#fff;transform:translateY(-1px)}.MMR_actionBtn:active{transform:translateY(0)}.MMR_actionBtnPrimary{background:rgba(59,130,246,0.14);border-color:rgba(59,130,246,0.32);color:#bfdbfe;box-shadow:0 1px 6px rgba(59,130,246,0.2)}.MMR_actionBtnPrimary:hover{background:rgba(59,130,246,0.24);border-color:rgba(59,130,246,0.55);color:#fff;box-shadow:0 2px 10px rgba(59,130,246,0.35)}.MMR_lightboxBackdrop{position:fixed;inset:0;z-index:999999;background:rgba(8,10,16,0.92);backdrop-filter:blur(24px) saturate(180%);display:flex;flex-direction:column;animation:MMRfadeIn .2s cubic-bezier(0.16,1,0.3,1)}@keyframes MMRfadeIn{from{opacity:0}to{opacity:1}}.MMR_lightboxHeader{flex:none;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid rgba(255,255,255,0.1);background:rgba(18,20,30,0.8);backdrop-filter:blur(16px);gap:16px}.MMR_lightboxTitleGroup{display:flex;align-items:center;gap:12px;min-width:0;flex:1}.MMR_lightboxPrompt{color:rgba(255,255,255,0.8);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:400}.MMR_lightboxActions{display:flex;align-items:center;gap:10px;flex:none}.MMR_lightboxClose{width:32px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.8);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s ease;padding:0}.MMR_lightboxClose:hover{background:var(--dsw-alias-state-error-primary);color:#fff;border-color:transparent;transform:scale(1.06)}.MMR_lightboxBody{flex:1;display:flex;align-items:center;justify-content:center;padding:24px;min-height:0;cursor:zoom-out}.MMR_lightboxMedia{max-width:92vw;max-height:84vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.12);animation:MMRscaleIn .22s cubic-bezier(0.16,1,0.3,1)}@keyframes MMRscaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}.MMR_audioPlayer{width:100%;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 14px;box-sizing:border-box;position:relative;backdrop-filter:blur(16px)}.MMR_playerMain{display:flex;align-items:center;gap:12px;width:100%;min-width:0}.MMR_playBtn{width:40px;height:40px;min-width:40px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 3px 12px rgba(37,99,235,0.38),inset 0 1px 1px rgba(255,255,255,0.4);transition:all .2s cubic-bezier(0.34,1.56,0.64,1);padding:0;outline:none;position:relative}.MMR_playBtn:hover{transform:scale(1.06);border-color:rgba(255,255,255,0.4);background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 100%);box-shadow:0 4px 18px rgba(59,130,246,0.55),inset 0 1px 1.5px rgba(255,255,255,0.6)}.MMR_playBtn:active{transform:scale(0.95);box-shadow:0 1px 4px rgba(37,99,235,0.3)}.MMR_playBtnActive{background:linear-gradient(135deg,#38bdf8 0%,#2563eb 100%);box-shadow:0 0 16px rgba(56,189,248,0.5),inset 0 1px 1.5px #fff;animation:MMR_playAura 2s ease-in-out infinite alternate}@keyframes MMR_playAura{0%{box-shadow:0 0 10px rgba(56,189,248,0.35)}100%{box-shadow:0 0 20px rgba(56,189,248,0.7)}}.MMR_playIcon{display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))}.MMR_playIconPlay{transform:translateX(1.5px)}.MMR_playerTrackWrap{flex:1;display:flex;flex-direction:column;gap:6px;position:relative;min-width:0;cursor:pointer;padding:4px 0}.MMR_playerWave{display:flex;align-items:center;gap:2px;height:34px;width:100%;padding:0 2px;position:relative}.MMR_waveBar{flex:1;min-width:1.5px;max-width:4px;border-radius:999px;transition:all .18s cubic-bezier(0.4,0,0.2,1)}.MMR_wavePlayed{background:linear-gradient(180deg,#93c5fd 0%,#3b82f6 60%,#1d4ed8 100%);box-shadow:0 0 4px rgba(59,130,246,0.35);opacity:1}.MMR_waveUnplayed{background:rgba(255,255,255,0.13);opacity:0.45}.MMR_playerTrackWrap:hover .MMR_waveUnplayed{opacity:0.6;background:rgba(255,255,255,0.2)}.MMR_playheadLaser{position:absolute;top:0;bottom:0;width:1.5px;background:#fff;border-radius:1px;box-shadow:0 0 6px #93c5fd,0 0 10px rgba(147,197,253,0.8);transform:translateX(-50%);pointer-events:none;z-index:3}.MMR_seekRange{width:100%;height:3px;border-radius:999px;appearance:none;-webkit-appearance:none;background:rgba(255,255,255,0.1);outline:none;cursor:pointer;margin:0;transition:all .2s ease}.MMR_playerTrackWrap:hover .MMR_seekRange{height:4px;background:rgba(255,255,255,0.16)}.MMR_seekRange::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(147,197,253,0.9),0 2px 4px rgba(0,0,0,0.4);cursor:pointer;transition:transform .15s ease}.MMR_seekRange::-webkit-slider-thumb:hover{transform:scale(1.3)}.MMR_hoverTip{position:absolute;top:-22px;transform:translateX(-50%);background:rgba(15,20,32,0.95);border:1px solid rgba(255,255,255,0.18);color:#e2e8f0;font-size:11px;padding:2px 6px;border-radius:5px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:5}.MMR_playerRightControls{display:flex;align-items:center;gap:8px;flex:none}.MMR_timeDisplay{display:inline-flex;align-items:baseline;gap:3px;font-size:11.5px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:600;white-space:nowrap;letter-spacing:.3px}.MMR_curTime{color:#93c5fd;text-shadow:0 0 6px rgba(147,197,253,0.3)}.MMR_sepTime{color:rgba(255,255,255,0.25);font-weight:400;margin:0 1px}.MMR_durTime{color:rgba(255,255,255,0.5)}.MMR_iconBtn{border:none;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);color:rgba(255,255,255,0.7);width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .16s ease;padding:0}.MMR_iconBtn:hover{background:rgba(255,255,255,0.14);border-color:rgba(255,255,255,0.24);color:#fff;transform:translateY(-1px)}.MMR_volWrap{position:relative;display:inline-flex;align-items:center}.MMR_volSliderPop{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:rgba(18,20,30,0.96);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 8px;box-shadow:0 8px 24px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10;backdrop-filter:blur(12px)}.MMR_volSlider{writing-mode:bt-lr;-webkit-appearance:slider-vertical;width:6px;height:64px;background:rgba(255,255,255,0.15);outline:none;border-radius:999px;cursor:pointer}";
        if (typeof document !== "undefined") {
            let tag = document.querySelector("style[data-plugin-css=\"dsh-multimodal-runtime/MediaSection.css\"]");
            if (tag === null) {
                tag = document.createElement("style");
                tag.dataset.plugin = "dsh-multimodal-runtime";
                tag.dataset.pluginCss = "dsh-multimodal-runtime/MediaSection.css";
                document.head.appendChild(tag);
            }
            tag.textContent = css;
        }
        // ── 文案字典 ─────────────────────────────────────────────────────────
        const NS = "settings.media";
        const zh = {
            nav: "多模态生成",
            title: "多模态生成",
            loading: "能力列表加载中…",
            error: "暂时无法读取媒体配置。",
            retry: "重试",
            refresh: "刷新",
            online: "ComfyUI 在线",
            offline: "ComfyUI 离线",
            noRecipes: "暂无已导入的工作流。在上方拖入 ComfyUI workflow JSON 即可导入。",
            workflowLabel: "工作流文件",
            modelLabel: "生图模型",
            samplerLabel: "采样器",
            schedulerLabel: "调度器",
            widthLabel: "宽",
            heightLabel: "高",
            stepsLabel: "步数",
            cfgLabel: "CFG",
            followBuiltin: "跟随工作流",
            followSampler: "跟随工作流",
            save: "保存",
            saving: "保存中…",
            saved: "已保存",
            opFailed: "操作失败",
            makeDefault: "设为该能力默认",
            isDefault: "默认",
            enable: "启用",
            disable: "停用",
            missingHint: "workflow 文件缺失",
            providersLabel: "模型服务",
            configured: "已配置",
            notConfigured: "未配置",
            saveKey: "保存 Key",
            clearKey: "清除 Key",
            importLabel: "导入自定义工作流",
            importName: "名称",
            importCaps: "能力类型",
            importDefault: "导入后设为这些能力的默认",
            importGo: "导入",
            importDone: "已导入，已加入下方能力列表",
            importBadJson: "JSON 解析失败",
            capT2I: "文生图",
            capI2I: "图片重绘",
            capT2V: "文生视频",
            capI2V: "图生视频",
            capFLF: "首尾帧视频",
            capMI2V: "多参生视频",
            capIV2V: "图+视频生视频",
            capV2A: "视频配音",
            capT2A: "文本配音",
            capT2M: "文生音乐",
            capIUp: "图片超分",
            capVUp: "视频超分",
            capRBG: "抠图去背景",
            capI2D: "图片转3D",
            detectOk: "已自动识别能力：",
            detectJoin: "、",
            detectNone: "未能自动识别能力类型，请手动勾选。",
            needNameAndCaps: "请拖入 ComfyUI API JSON 并填写名称",
            dropHint: "拖入 ComfyUI API 格式 workflow JSON 到这里（或点击选择文件）",
            dropLoaded: "已读取工作流文件，可修改名称后导入",
            enabledTag: "已启用",
            disabledTag: "已停用",
            paramsTitle: "参数配置",
            duration: "时长(秒)",
            steps: "步数",
            cfg: "CFG",
            width: "宽",
            height: "高",
            saveParams: "保存参数",
            chipDuration: "时长",

            cardFailed: "任务查询失败",
            openFile: "打开",
            download: "下载",
            outputsLabel: "产出",
            inputsLabel: "输入素材",
            mmrMenu: "多模态生成",
            genImage: "生成图像",
            genVideo: "生成视频",
            genAudio: "生成音频",
            genFailed: "生成失败",
            genDone: "已完成",
            chipWorkflow: "工作流",
            chipRatio: "比例",
            defaultRoute: "默认路由",
            noWorkflowHint: "暂无可用工作流，请先在 设置→多模态生成 导入",
            grpComfy: "本地工作流",
            grpRh: "RunningHub",
            grpOr: "OpenRouter",
            rename: "重命名",
            renamePrompt: "输入新名称",
            comfyNamePrompt: "工作流名称（建议与 ComfyUI 里一致，留空自动生成）",
            autoReadComfy: "自动读取当前工作流",
            autoReadComfyHint: "读取 ComfyUI 最近一次运行的工作流并自动识别能力后导入",
            rhWorkflowUrl: "工作流链接或 ID",
            readAndImport: "读取并导入",
            manualImport: "或手动拖入 ComfyUI API 格式 JSON",
            addModel: "添加模型",
            modelPlaceholder: "模型名，如 google/gemini-2.5-flash-image",
            rhCat: "分类",
            provRh: "RunningHub · 消费级（工作流/AI 应用）",
            "prov_runninghub-cn": "RunningHub 国内版 (runninghub.cn)",
            "provDesc_runninghub-cn": "国内端点与 AI 应用/工作流执行（消费级 Key）",
            "prov_runninghub-global": "RunningHub 国际版 (runninghub.ai)",
            "provDesc_runninghub-global": "国际端点与 AI 应用/工作流执行（消费级 Key）",
            provRhE: "RunningHub · 企业级（模型 API）",
            balance: "余额",
            rhCatAll: "全部",
            rhSearch: "搜索模型名或端点…",
            rhNoMatch: "无匹配端点，可手输端点名",
            rhSelected: "已选",
            rhAppOut: "应用输出",
            outImage: "图片",
            outVideo: "视频",
            outAudio: "音频",
            verifyKey: "验证",
            rhKeyOk: "Key 有效",
            rhKeyEnterprise: "企业级-共享",
            rhWarnConsumer: "注意：模型 API 仅支持企业级-共享 Key，当前为",
            orResolve: "识别",            rhAppUrl: "应用链接或 ID",
            rhAppNode: "输入节点 ID（缺省 39）",
            rhEndpoint: "模型端点，如 image-to-video",
            addRhApp: "导入应用",
            addRhEndpoint: "导入端点",
            needAppUrl: "请粘贴 RunningHub 应用链接或 ID",
            needEndpoint: "请填写 RunningHub 模型端点",            needRhUrl: "请粘贴 RunningHub 工作流链接或 ID",
            needModel: "请填写 OpenRouter 模型名",
            provComfy: "ComfyUI（本机）",
            provOr: "OpenRouter",
            provComfyDesc: "本机 ComfyUI，无需 Key",
            provRhDesc: "工作流与 AI 应用（消费级-会员 Key）",
            provRhEDesc: "标准模型 API（企业级-共享 Key）",
            provOrDesc: "图像 / 音频生成模型",
            rhBlockWf: "① 工作流链接 · 消费级 Key",
            rhBlockApp: "② AI 应用 · 消费级 Key",
            rhBlockModel: "③ 模型目录 · 企业级 Key",
            rhEntWarn: "未配置企业级 Key：导入的模型端点将无法执行，请在下方「模型服务」填写后重试",
            rhRefresh: "刷新目录",
            rhRefreshOk: "模型目录已更新：{n} 个端点",
            provStaleHint: "宿主运行旧版本：保存该 Key 需重启宿主后生效"
        };
        const en = {
            nav: "Multimodal",
            title: "Multimodal Generation",
            loading: "Loading capability list…",
            error: "Media settings are temporarily unavailable.",
            retry: "Retry",
            refresh: "Refresh",
            online: "ComfyUI online",
            offline: "ComfyUI offline",
            noRecipes: "No workflows imported yet. Drop a ComfyUI workflow JSON above to get started.",
            workflowLabel: "Workflow file",
            modelLabel: "Image model",
            samplerLabel: "Sampler",
            schedulerLabel: "Scheduler",
            widthLabel: "Width",
            heightLabel: "Height",
            stepsLabel: "Steps",
            cfgLabel: "CFG",
            followBuiltin: "Follow workflow",
            followSampler: "Follow workflow",
            save: "Save",
            saving: "Saving…",
            saved: "Saved",
            opFailed: "Operation failed",
            makeDefault: "Set as default for this capability",
            isDefault: "Default",
            enable: "Enable",
            disable: "Disable",
            missingHint: "workflow file missing",
            providersLabel: "Model providers",
            configured: "Configured",
            notConfigured: "Not configured",
            saveKey: "Save key",
            clearKey: "Clear key",
            importLabel: "Import custom workflow",
            importName: "Name",
            importCaps: "Capabilities",
            importDefault: "Set as default for these capabilities",
            importGo: "Import",
            importDone: "Imported; added to the capability list below",
            importBadJson: "Failed to parse JSON",
            capT2I: "Text to Image",
            capI2I: "Image to Image",
            capT2V: "Text to Video",
            capI2V: "Image to Video",
            capFLF: "First-Last Frame Video",
            capMI2V: "Multi-Param to Video",
            capIV2V: "Image+Video to Video",
            capV2A: "Video to Audio",
            capT2A: "Text to Audio",
            capT2M: "Text to Music",
            capIUp: "Image Upscale",
            capVUp: "Video Upscale",
            capRBG: "Remove Background",
            capI2D: "Image to 3D",
            detectOk: "Auto-detected capabilities: ",
            detectJoin: ", ",
            detectNone: "Couldn't detect the capability type — check one manually.",
            needNameAndCaps: "Drop a ComfyUI API JSON and provide a name",
            dropHint: "Drop a ComfyUI API-format workflow JSON here (or click to pick a file)",
            dropLoaded: "Workflow file loaded; adjust the name and import",
            enabledTag: "Enabled",
            disabledTag: "Disabled",
            paramsTitle: "Parameters",
            duration: "Duration(s)",
            steps: "Steps",
            cfg: "CFG",
            width: "W",
            height: "H",
            saveParams: "Save Params",
            chipDuration: "Duration",

            cardFailed: "Task query failed",
            openFile: "Open",
            outputsLabel: "Outputs",
            inputsLabel: "Inputs",
            mmrMenu: "Multimodal",
            genImage: "Generate image",
            genVideo: "Generate video",
            genAudio: "Generate audio",
            genFailed: "Failed",
            genDone: "Done",
            chipWorkflow: "Workflow",
            chipRatio: "Ratio",
            defaultRoute: "Auto route",
            noWorkflowHint: "No workflows yet — import one in Settings → Multimodal first",
            grpComfy: "Local workflows",
            grpRh: "RunningHub",
            grpOr: "OpenRouter",
            rename: "Rename",
            renamePrompt: "Enter a new name",
            comfyNamePrompt: "Workflow name (match the one in ComfyUI; leave blank for auto)",
            autoReadComfy: "Auto-read current workflow",
            autoReadComfyHint: "Read the most recently run ComfyUI workflow and import it with auto-detected capabilities",
            rhWorkflowUrl: "Workflow URL or ID",
            readAndImport: "Read & import",
            manualImport: "Or drop a ComfyUI API-format JSON manually",
            addModel: "Add model",
            modelPlaceholder: "Model, e.g. google/gemini-2.5-flash-image",
            rhCat: "Category",
            provRh: "RunningHub · Consumer (Workflows/Apps)",
            provRhE: "RunningHub · Enterprise (Model API)",
            balance: "Balance",
            rhCatAll: "All",
            rhSearch: "Search model name or endpoint…",
            rhNoMatch: "No match; you can still type an endpoint manually",
            rhSelected: "Selected",
            rhAppOut: "App output",
            outImage: "Image",
            outVideo: "Video",
            outAudio: "Audio",
            verifyKey: "Verify",
            rhKeyOk: "Key valid",
            rhKeyEnterprise: "Enterprise-Shared",
            rhWarnConsumer: "Note: Model API requires an Enterprise-Shared key; current is",
            orResolve: "Resolve",            rhAppUrl: "App URL or ID",
            rhAppNode: "Input node ID (default 39)",
            rhEndpoint: "Model endpoint, e.g. image-to-video",
            addRhApp: "Import app",
            addRhEndpoint: "Import endpoint",
            needAppUrl: "Paste a RunningHub app URL or ID",
            needEndpoint: "Enter a RunningHub model endpoint",            needRhUrl: "Paste a RunningHub workflow URL or ID",
            needModel: "Enter an OpenRouter model name",
            provComfy: "ComfyUI (local)",
            provOr: "OpenRouter",
            provComfyDesc: "Local ComfyUI, no key needed",
            provRhDesc: "Workflows & AI apps (consumer key)",
            provRhEDesc: "Standard model API (enterprise-shared key)",
            provOrDesc: "Image / audio generation models",
            rhBlockWf: "① Workflow URL · Consumer key",
            rhBlockApp: "② AI App · Consumer key",
            rhBlockModel: "③ Model catalog · Enterprise key",
            rhEntWarn: "Enterprise key not configured: imported endpoints cannot run. Fill it in Model providers below.",
            rhRefresh: "Refresh catalog",
            rhRefreshOk: "Catalog updated: {n} endpoints",
            provStaleHint: "Host runs an old build — restart host to activate saving"
        };
        // ── 远程贡献 ─────────────────────────────────────────────────────────
        const identity = (value) => value;
        const codec = (symbol) => ({ mode: "strict", typeSymbol: symbol, schema: { parse: identity } });
        const CONTRIBUTION = {
            package: "dsh-multimodal-runtime",
            descriptors: [
                {
                    id: "dsh-multimodal-runtime#mediaSettings/overview",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "overview",
                    invocation: { kind: "direct" },
                    parameters: [],
                    result: codec("dsh-multimodal-runtime#OverviewResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/setEnabled",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "setEnabled",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#SetEnabledPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#SetEnabledResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/setCapabilityDefault",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "setCapabilityDefault",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#SetDefaultPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#SetDefaultResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/updateRecipe",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "updateRecipe",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#UpdatePayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#UpdateResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/listProviders",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "listProviders",
                    invocation: { kind: "direct" },
                    parameters: [],
                    result: codec("dsh-multimodal-runtime#ListProvidersResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/setProviderConfig",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "setProviderConfig",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#SetProviderConfigPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#SetProviderConfigResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/importWorkflow",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "importWorkflow",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#ImportWorkflowPayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#ImportWorkflowResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/autoImportComfy",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "autoImportComfy",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#AutoImportComfyPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#AutoImportResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/autoImportRunningHub",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "autoImportRunningHub",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#AutoImportRunningHubPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#AutoImportResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/addOpenRouter",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "addOpenRouter",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#AddOpenRouterPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#AutoImportResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/verifyRunningHubKey",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "verifyRunningHubKey",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#VerifyRunningHubKeyPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#VerifyRunningHubKeyResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/resolveOpenRouterModel",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "resolveOpenRouterModel",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#ResolveOpenRouterModelPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#ResolveOpenRouterModelResult")
                },                {
                    id: "dsh-multimodal-runtime#mediaSettings/addRunningHubApp",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "addRunningHubApp",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#AddRunningHubAppPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#AutoImportResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/addRunningHubEndpoint",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "addRunningHubEndpoint",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#AddRunningHubEndpointPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#AutoImportResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/refreshRhCatalog",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "refreshRhCatalog",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#RefreshRhCatalogPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#RefreshRhCatalogResult")
                },                {
                    id: "dsh-multimodal-runtime#mediaSettings/quickCreateTask",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "quickCreateTask",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "sessionId", wire: "sessionId", source: "json", acceptsUndefined: true, codec: codec("dsh-multimodal-runtime#sessionId") },
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#QuickCreatePayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#QuickCreateResultW")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/ingestMedia",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "ingestMedia",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "sessionId", wire: "sessionId", source: "json", acceptsUndefined: true, codec: codec("dsh-multimodal-runtime#sessionId") },
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#IngestMediaPayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#IngestMediaResultW")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/previewMedia",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "previewMedia",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "sessionId", wire: "sessionId", source: "json", acceptsUndefined: true, codec: codec("dsh-multimodal-runtime#sessionId") },
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#MediaTargetPayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#PreviewMediaResultW")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/openMedia",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "openMedia",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "sessionId", wire: "sessionId", source: "json", acceptsUndefined: true, codec: codec("dsh-multimodal-runtime#sessionId") },
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#MediaTargetPayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#OpenMediaResultW")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/revealMedia",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "revealMedia",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "sessionId", wire: "sessionId", source: "json", acceptsUndefined: true, codec: codec("dsh-multimodal-runtime#sessionId") },
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#MediaTargetPayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#RevealMediaResultW")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/setComposerSelection",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "setComposerSelection",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "sessionId", wire: "sessionId", source: "json", acceptsUndefined: true, codec: codec("dsh-multimodal-runtime#sessionId") },
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#ComposerSelectionPayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#ComposerSelectionResultW")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/assetData",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "assetData",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#AssetPayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#AssetDataResultW")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/revealAsset",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "revealAsset",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#AssetPayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#AssetRevealResultW")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/taskSnapshot",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "taskSnapshot",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#TaskSnapshotPayloadW") }
                    ],
                    result: codec("dsh-multimodal-runtime#TaskSnapshotResultW")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/updateRecipeMeta",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "updateRecipeMeta",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#UpdateRecipeMetaPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#UpdateRecipeMetaResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/inspectWorkflowNodes",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "inspectWorkflowNodes",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#InspectWorkflowNodesPayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#InspectWorkflowNodesResult")
                },
                {
                    id: "dsh-multimodal-runtime#mediaSettings/deleteRecipe",
                    service: "mediaSettings",
                    namespace: "mediaSettings",
                    method: "deleteRecipe",
                    invocation: { kind: "direct" },
                    parameters: [
                        { name: "payload", wire: "payload", source: "json", codec: codec("dsh-multimodal-runtime#DeleteRecipePayload") }
                    ],
                    result: codec("dsh-multimodal-runtime#DeleteRecipeResult")
                }
            ]
        };
        // ── 单个 Recipe 卡片 ─────────────────────────────────────────────────
        function RecipeCard({ t, group, row, busyKey, opState, applyEnabled, applyDefault, applyRename, applyCapability, applyDelete, applyDefaults, inspectWorkflowNodes }) {
            const isVideo = group.type?.includes('video') || group.type === 'multi-image-to-video' || group.type === 'image-to-video' || group.type === 'text-to-video' || group.type === 'first-last-frame-video';
            const [showParams, setShowParams] = react.useState(false);
            const [params, setParams] = react.useState(() => ({
                minDuration: row.defaults?.minDuration ?? 1,
                maxDuration: row.defaults?.maxDuration ?? 15,
                duration: row.defaults?.duration ?? 5,
            }));
            const [exposedParams, setExposedParams] = react.useState(() => (Array.isArray(row.defaults?.exposedParams) ? row.defaults.exposedParams.filter(mmrNotPromptParam) : []));
            const [inspectLoading, setInspectLoading] = react.useState(false);
            const [inspectData, setInspectData] = react.useState(null);
            const [selectedNodeField, setSelectedNodeField] = react.useState("");

            const loadInspect = async () => {
                console.log("[RecipeCard loadInspect START]", row.id, typeof inspectWorkflowNodes);
                if (typeof inspectWorkflowNodes !== "function") return;
                setInspectLoading(true);
                try {
                    const res = await inspectWorkflowNodes({ recipeId: row.id });
                    console.log("[RecipeCard loadInspect RESULT]", row.id, res);
                    setInspectData(res);
                    if (exposedParams.length === 0 && Array.isArray(res?.suggestedExposedParams) && res.suggestedExposedParams.length > 0) {
                        setExposedParams(res.suggestedExposedParams.filter(mmrNotPromptParam));
                    }
                } catch (e) {
                    console.warn("[MMR] inspectWorkflowNodes error:", e);
                } finally {
                    setInspectLoading(false);
                }
            };

            const toggleParams = () => {
                const next = !showParams;
                setShowParams(next);
                if (next) {
                    void loadInspect();
                }
            };

            const addFromSelected = () => {
                if (!selectedNodeField || !inspectData?.nodes) return;
                const parts = selectedNodeField.split("::");
                const nid = parts[0];
                const field = parts[1];
                const node = inspectData.nodes.find((n) => String(n.id) === String(nid));
                const input = node?.inputs?.find((i) => i.field === field);
                if (!node || !input) return;
                const newId = nid + "_" + field;
                if (exposedParams.some((p) => p.id === newId)) return;
                const pType = input.type === "select" ? "select" : input.type === "slider" ? "slider" : input.type === "number" ? "number" : "text";
                const newParam = {
                    id: newId,
                    label: field === "aspect_ratio" ? "画面比例" : field === "megapixels" ? "像素大小" : field === "duration" ? "时长" : field === "steps" ? "步数" : field,
                    nodeId: String(nid),
                    nodeTitle: node.title,
                    field: field,
                    type: pType,
                    options: input.options || (pType === "select" ? ["16:9 (Widescreen)", "1:1 (Square)", "9:16 (Vertical)", "4:3", "3:4"] : undefined),
                    min: input.min,
                    max: input.max,
                    step: input.step,
                    default: input.value
                };
                setExposedParams((prev) => [...prev, newParam]);
            };

            const addAllSuggested = () => {
                if (!inspectData?.suggestedExposedParams) return;
                setExposedParams(inspectData.suggestedExposedParams);
            };

            const removeParam = (id) => {
                setExposedParams((prev) => prev.filter((p) => p.id !== id));
            };

            const updateParamItem = (id, mutate) => {
                setExposedParams((prev) => prev.map((p) => (p.id === id ? mutate(p) : p)));
            };

            return (0, react_jsx_runtime.jsxs)("div", {
                className: "MMR_card",
                "data-off": row.enabled ? void 0 : "true",
                children: [
                    (0, react_jsx_runtime.jsxs)("div", {
                        className: "MMR_cardHead",
                        children: [
                            (0, react_jsx_runtime.jsx)("button", {
                                type: "button",
                                className: "MMR_starBtn",
                                "data-on": row.isDefault ? "true" : void 0,
                                title: row.isDefault ? t("isDefault") : t("makeDefault"),
                                disabled: busyKey === row.id,
                                onClick: () => applyDefault(group.type, row)
                            }),
                            (0, react_jsx_runtime.jsx)("span", {
                                className: "MMR_name",
                                children: row.name
                            }),
                            (0, react_jsx_runtime.jsx)("button", {
                                type: "button",
                                className: "MMR_epAdd",
                                title: t("rename"),
                                disabled: busyKey === "rename:" + row.id,
                                onClick: () => void applyRename(row),
                                children: "✎"
                            }),
                            (0, react_jsx_runtime.jsx)("span", {
                                className: "MMR_badge",
                                "data-state": row.enabled ? "done" : "off",
                                style: row.enabled ? void 0 : { opacity: 1 },
                                children: row.enabled ? t("enabledTag") : t("disabledTag")
                            }),
                            (0, react_jsx_runtime.jsx)("span", {
                                className: "MMR_idTag",
                                children: row.id
                            }),
                            (0, react_jsx_runtime.jsxs)("span", {
                                className: "MMR_switchRow",
                                children: [
                                    (0, react_jsx_runtime.jsx)("button", {
                                        type: "button",
                                        role: "switch",
                                        className: "MMR_switch",
                                        "data-on": row.enabled ? "true" : void 0,
                                        "aria-checked": row.enabled,
                                        "aria-label": row.enabled ? t("disable") : t("enable"),
                                        disabled: busyKey === row.id,
                                        onClick: () => applyEnabled(row)
                                    }),
                                    (0, react_jsx_runtime.jsx)("span", {
                                        className: "MMR_switchText",
                                        children: row.enabled ? t("disable") : t("enable")
                                    })
                                ]
                            }),
                            (0, react_jsx_runtime.jsxs)("select", {
                                className: "MMR_select",
                                style: { maxWidth: "110px", fontSize: "11px", height: "22px", padding: "1px 4px" },
                                title: "切换能力分类",
                                value: group.type,
                                disabled: busyKey === "cap:" + row.id,
                                onChange: (e) => applyCapability && applyCapability(row, e.target.value),
                                children: CAP_TYPES.map((c) => (0, react_jsx_runtime.jsx)("option", { value: c[0], children: capLabelWithT(c[0], t) }, c[0]))
                            }),
                            (0, react_jsx_runtime.jsx)("button", {
                                type: "button",
                                className: "MMR_epAdd",
                                style: { fontSize: "11px", padding: "0 4px", opacity: showParams ? 1 : 0.7 },
                                title: "节点参数设置",
                                onClick: toggleParams,
                                children: "⚙"
                            }),
                            (0, react_jsx_runtime.jsx)("button", {
                                type: "button",
                                className: "MMR_epAdd",
                                style: { color: "var(--dsw-alias-state-error-primary, #ff4d4f)" },
                                title: "删除工作流",
                                disabled: busyKey === "delete:" + row.id,
                                onClick: () => void (applyDelete && applyDelete(row)),
                                children: "🗑"
                            })
                        ]
                    }),
                    (showParams ? (0, react_jsx_runtime.jsxs)("div", {
                        style: { display: "flex", flexDirection: "column", gap: "8px", padding: "8px 10px", background: "var(--dsw-alias-fill-quaternary, rgba(255,255,255,0.04))", borderRadius: "6px", marginTop: "6px", fontSize: "11px" },
                        children: [
                            (isVideo ? (0, react_jsx_runtime.jsxs)("div", {
                                style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
                                children: [
                                    (0, react_jsx_runtime.jsx)("span", { style: { color: "var(--dsw-alias-label-secondary)", fontWeight: 600 }, children: "视频时长范围(秒):" }),
                                    (0, react_jsx_runtime.jsxs)("label", {
                                        style: { display: "inline-flex", alignItems: "center", gap: "4px" },
                                        children: [
                                            (0, react_jsx_runtime.jsx)("span", { style: { color: "var(--dsw-alias-label-secondary)" }, children: "最小" }),
                                            (0, react_jsx_runtime.jsx)("input", {
                                                type: "number",
                                                className: "MMR_input",
                                                style: { width: "46px", height: "20px", padding: "1px 4px", fontSize: "11px" },
                                                min: 1,
                                                max: 60,
                                                value: params.minDuration,
                                                onChange: (e) => setParams((p) => ({ ...p, minDuration: Number(e.target.value) }))
                                            })
                                        ]
                                    }),
                                    (0, react_jsx_runtime.jsx)("span", { children: "~" }),
                                    (0, react_jsx_runtime.jsxs)("label", {
                                        style: { display: "inline-flex", alignItems: "center", gap: "4px" },
                                        children: [
                                            (0, react_jsx_runtime.jsx)("span", { style: { color: "var(--dsw-alias-label-secondary)" }, children: "最大" }),
                                            (0, react_jsx_runtime.jsx)("input", {
                                                type: "number",
                                                className: "MMR_input",
                                                style: { width: "46px", height: "20px", padding: "1px 4px", fontSize: "11px" },
                                                min: 1,
                                                max: 120,
                                                value: params.maxDuration,
                                                onChange: (e) => setParams((p) => ({ ...p, maxDuration: Number(e.target.value) }))
                                            })
                                        ]
                                    })
                                ]
                            }) : null),
                            (0, react_jsx_runtime.jsxs)("div", {
                                style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: isVideo ? "4px" : "0" },
                                children: [
                                    (0, react_jsx_runtime.jsx)("span", { style: { color: "var(--dsw-alias-label-secondary)", fontWeight: 600 }, children: "对话框暴露节点参数 (输入芯片条交互):" }),
                                    (inspectData?.suggestedExposedParams?.length ? (0, react_jsx_runtime.jsx)("button", {
                                        type: "button",
                                        className: "MMR_refreshBtn",
                                        style: { fontSize: "10px", padding: "1px 6px" },
                                        onClick: addAllSuggested,
                                        children: "✦ 自动加载推荐参数"
                                    }) : null)
                                ]
                            }),
                            (inspectLoading ? (0, react_jsx_runtime.jsx)("div", { style: { color: "var(--dsw-alias-label-tertiary)" }, children: "正在读取工作流节点..." }) : null),
                            (exposedParams.length === 0 && !inspectLoading ? (0, react_jsx_runtime.jsx)("div", { style: { color: "var(--dsw-alias-label-tertiary)", fontStyle: "italic" }, children: "暂未配置暴露参数（缺省使用通用比例/时长滑块）" }) : null),
                            ...exposedParams.map((p) => (0, react_jsx_runtime.jsxs)("div", {
                                style: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", padding: "4px 6px", background: "var(--dsw-alias-fill-tertiary, rgba(0,0,0,0.15))", borderRadius: "4px" },
                                children: [
                                    (0, react_jsx_runtime.jsx)("input", {
                                        type: "text",
                                        className: "MMR_input",
                                        style: { width: "70px", height: "20px", padding: "1px 4px", fontSize: "11px" },
                                        title: "显示标签名",
                                        value: p.label,
                                        onChange: (e) => updateParamItem(p.id, (x) => ({ ...x, label: e.target.value }))
                                    }),
                                    (0, react_jsx_runtime.jsxs)("span", {
                                        style: { color: "var(--dsw-alias-label-tertiary)", fontSize: "10px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                                        title: "#" + p.nodeId + " " + (p.nodeTitle || "") + " -> " + p.field,
                                        children: ["#", p.nodeId, " ", (p.nodeTitle || ''), "·", p.field]
                                    }),
                                    (0, react_jsx_runtime.jsxs)("select", {
                                        className: "MMR_select",
                                        style: { maxWidth: "80px", height: "20px", fontSize: "10px", padding: "1px 2px" },
                                        value: p.type,
                                        onChange: (e) => updateParamItem(p.id, (x) => ({ ...x, type: e.target.value })),
                                        children: [
                                            (0, react_jsx_runtime.jsx)("option", { value: "select", children: "下拉选择" }),
                                            (0, react_jsx_runtime.jsx)("option", { value: "slider", children: "滑块" }),
                                            (0, react_jsx_runtime.jsx)("option", { value: "number", children: "数值" }),
                                            (0, react_jsx_runtime.jsx)("option", { value: "text", children: "文本" })
                                        ]
                                    }),
                                    (p.type === "select" ? (0, react_jsx_runtime.jsx)("input", {
                                        type: "text",
                                        className: "MMR_input",
                                        style: { flex: 1, minWidth: "130px", height: "20px", padding: "1px 4px", fontSize: "10px" },
                                        placeholder: "选项 (逗号隔开)",
                                        title: "选项 (英文逗号隔开)",
                                        value: (p.options || []).join(", "),
                                        onChange: (e) => updateParamItem(p.id, (x) => ({ ...x, options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))
                                    }) : null),
                                    (p.type === "slider" || p.type === "number" ? (0, react_jsx_runtime.jsxs)("div", {
                                        style: { display: "inline-flex", alignItems: "center", gap: "3px" },
                                        children: [
                                            (0, react_jsx_runtime.jsx)("input", {
                                                type: "number",
                                                className: "MMR_input",
                                                style: { width: "42px", height: "20px", padding: "1px 2px", fontSize: "10px" },
                                                placeholder: "最小",
                                                value: p.min ?? "",
                                                onChange: (e) => updateParamItem(p.id, (x) => ({ ...x, min: Number(e.target.value) }))
                                            }),
                                            (0, react_jsx_runtime.jsx)("span", { children: "~" }),
                                            (0, react_jsx_runtime.jsx)("input", {
                                                type: "number",
                                                className: "MMR_input",
                                                style: { width: "42px", height: "20px", padding: "1px 2px", fontSize: "10px" },
                                                placeholder: "最大",
                                                value: p.max ?? "",
                                                onChange: (e) => updateParamItem(p.id, (x) => ({ ...x, max: Number(e.target.value) }))
                                            })
                                        ]
                                    }) : null),
                                    (0, react_jsx_runtime.jsx)("button", {
                                        type: "button",
                                        className: "MMR_epAdd",
                                        style: { color: "var(--dsw-alias-state-error-primary, #ff4d4f)", fontSize: "10px" },
                                        title: "移除参数",
                                        onClick: () => removeParam(p.id),
                                        children: "✕"
                                    })
                                ]
                            }, p.id)),
                            (inspectData?.nodes?.length ? (0, react_jsx_runtime.jsxs)("div", {
                                style: { display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" },
                                children: [
                                    (0, react_jsx_runtime.jsxs)("select", {
                                        className: "MMR_select",
                                        style: { maxWidth: "240px", height: "22px", fontSize: "10px" },
                                        value: selectedNodeField,
                                        onChange: (e) => setSelectedNodeField(e.target.value),
                                        children: [
                                            (0, react_jsx_runtime.jsx)("option", { value: "", children: "-- 选择工作流节点参数添加 --" }),
                                            ...inspectData.nodes.map((n) => (0, react_jsx_runtime.jsx)("optgroup", {
                                                label: "#" + n.id + " " + n.title + " (" + n.classType + ")",
                                                children: n.inputs.map((inp) => (0, react_jsx_runtime.jsx)("option", {
                                                    value: n.id + "::" + inp.field,
                                                    children: inp.field + " (" + inp.type + (inp.value !== undefined ? " = " + String(inp.value).slice(0, 15) : "") + ")"
                                                }, n.id + "_" + inp.field))
                                            }, n.id))
                                        ]
                                    }),
                                    (0, react_jsx_runtime.jsx)("button", {
                                        type: "button",
                                        className: "MMR_saveBtn",
                                        style: { height: "22px", padding: "0 6px", fontSize: "10px" },
                                        disabled: !selectedNodeField,
                                        onClick: addFromSelected,
                                        children: "+ 添加节点参数"
                                    })
                                ]
                            }) : null),
                            (0, react_jsx_runtime.jsxs)("div", {
                                style: { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" },
                                children: [
                                    (0, react_jsx_runtime.jsx)("button", {
                                        type: "button",
                                        className: "MMR_refreshBtn",
                                        style: { height: "22px", padding: "0 8px", fontSize: "11px" },
                                        onClick: () => setShowParams(false),
                                        children: "取消"
                                    }),
                                    (0, react_jsx_runtime.jsx)("button", {
                                        type: "button",
                                        className: "MMR_saveBtn",
                                        style: { height: "22px", padding: "0 10px", fontSize: "11px" },
                                        disabled: busyKey === "params:" + row.id,
                                        onClick: () => {
                                            if (applyDefaults) {
                                                applyDefaults(row, {
                                                    minDuration: params.minDuration,
                                                    maxDuration: params.maxDuration,
                                                    duration: Math.max(params.minDuration, Math.min(params.duration, params.maxDuration)),
                                                    exposedParams: exposedParams
                                                });
                                            }
                                            setShowParams(false);
                                        },
                                        children: "保存节点参数"
                                    })
                                ]
                            })
                        ]
                    }) : null),
                    (0, react_jsx_runtime.jsxs)("div", {
                        className: "MMR_footRow",
                        children: [
                            (opState?.status === "busy" ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_hint", children: t("saving") }) : null),
                            (opState?.status === "ok" ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_hint", "data-ok": "true", children: t("saved") }) : null),
                            (opState?.status === "error" ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_hint", "data-ok": "false", children: t("opFailed") }) : null)
                        ]
                    })
                ]
            }, row.id);
        }
        // ── 设置页区块 ────────────────────────────────────────────────────────
        const emptyOverview = () => ({ providerOnline: false, workflows: [], models: { checkpoints: [], samplers: [], schedulers: [] }, capabilities: [] });
        // overview 模块级缓存：设置页再次打开时秒开，不再闪「正在读取媒体配置…」；
        // 首次进入无缓存才显示 loading，之后打开用缓存立即渲染并后台静默刷新。
        let overviewCache = null;
        const RH_ENDPOINTS = JSON.parse("{\"version\":\"2026-08-18\",\"count\":298,\"endpoints\":[{\"endpoint\":\"rhart-audio/text-to-audio/speech-2.8-hd\",\"name\":\"minimax/speech-2.8-hd\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":1},{\"endpoint\":\"rhart-image-n-pro/edit\",\"name\":\"全能图片PRO-图生图-低价渠道版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":1},{\"endpoint\":\"rhart-image-n-pro/text-to-image\",\"name\":\"全能图片PRO-文生图-低价渠道版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":1},{\"endpoint\":\"rhart-video-s/image-to-video\",\"name\":\"全能视频S-图生视频-低价渠道版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":1},{\"endpoint\":\"rhart-video-s/text-to-video\",\"name\":\"全能视频S-文生视频-低价渠道版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":1},{\"endpoint\":\"topazlabs/image-upscale-standard-v2\",\"name\":\"topazlabs图像放大StandardV2\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":1},{\"endpoint\":\"rhart-audio/text-to-audio/speech-02-hd\",\"name\":\"minimax/speech-02-hd\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":2},{\"endpoint\":\"topazlabs/image-upscale-high-fidelity-v2\",\"name\":\"topazlabs图像放大High Fidelity V2\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":2},{\"endpoint\":\"rhart-audio/text-to-audio/speech-2.8-turbo\",\"name\":\"minimax/speech-2.8-turbo\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":3},{\"endpoint\":\"rhart-image-g-3/image-to-image\",\"name\":\"全能图片X-3-图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":3},{\"endpoint\":\"rhart-image-g-3/text-to-image\",\"name\":\"全能图片X-3-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":3},{\"endpoint\":\"rhart-video-s-official/image-to-video\",\"name\":\"全能视频S-图生视频-官方稳定版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":3},{\"endpoint\":\"rhart-video-s-official/text-to-video\",\"name\":\"全能视频S-文生视频-官方稳定版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":3},{\"endpoint\":\"topazlabs/image-upscale/low-resolution-v2\",\"name\":\"topazlabs图像放大Low Resolution V2\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":3},{\"endpoint\":\"rhart-audio/text-to-audio/speech-02-turbo\",\"name\":\"minimax/speech-02-turbo\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":4},{\"endpoint\":\"rhart-image-g-4/image-to-image\",\"name\":\"全能图片X-4-图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":4},{\"endpoint\":\"rhart-image-g-4/text-to-image\",\"name\":\"全能图片X-4-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":4},{\"endpoint\":\"rhart-video-s-official/image-to-video-pro\",\"name\":\"全能视频S-图生视频-pro-官方稳定版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":4},{\"endpoint\":\"rhart-video-s-official/text-to-video-pro\",\"name\":\"全能视频S-文生视频-pro-官方稳定版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":4},{\"endpoint\":\"topazlabs/image-upscale-cgi\",\"name\":\"topazlabs图像放大CGI\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":4},{\"endpoint\":\"kling-v3.0-pro/text-to-video\",\"name\":\"可灵文生视频3.0-pro\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":5},{\"endpoint\":\"rhart-audio/text-to-audio/speech-2.6-hd\",\"name\":\"minimax/speech-2.6-hd\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":5},{\"endpoint\":\"rhart-image-n-g31-flash/image-to-image\",\"name\":\"全能图片V2-图生图-低价渠道版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":5},{\"endpoint\":\"rhart-image-n-g31-flash/text-to-image\",\"name\":\"全能图片V2-文生图-低价渠道版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":5},{\"endpoint\":\"rhart-video-s-official/image-to-video-realistic\",\"name\":\"全能视频S-图生视频-支持真人-官方稳定版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":5},{\"endpoint\":\"topazlabs/image-upscale-text-refine\",\"name\":\"topazlabs图像放大Text Refine\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":5},{\"endpoint\":\"kling-v3.0-pro/image-to-video\",\"name\":\"可灵图生视频3.0-pro\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":6},{\"endpoint\":\"kling-v3.0-std/text-to-video\",\"name\":\"可灵文生视频3.0-std\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":6},{\"endpoint\":\"rhart-audio/text-to-audio/speech-2.6-turbo\",\"name\":\"minimax/speech-2.6-turbo\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":6},{\"endpoint\":\"rhart-image-n-pro-official/edit\",\"name\":\"全能图片PRO-图生图-官方稳定版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":6},{\"endpoint\":\"rhart-image-n-pro-official/text-to-image\",\"name\":\"全能图片PRO-文生图-官方稳定版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":6},{\"endpoint\":\"kling-v3.0-std/image-to-video\",\"name\":\"可灵图生视频3.0-std\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":7},{\"endpoint\":\"kling-video-o3-pro/text-to-video\",\"name\":\"可灵文生视频o3-pro\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":7},{\"endpoint\":\"rhart-audio/text-to-audio/music-2.5\",\"name\":\"minimax/music-2.5\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":7},{\"endpoint\":\"rhart-image-n-pro-official/edit-ultra\",\"name\":\"全能图片PRO-图生图Ultra-官方稳定版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":7},{\"endpoint\":\"rhart-image-n-pro-official/text-to-image-ultra\",\"name\":\"全能图片PRO-文生图Ultra-官方稳定版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":7},{\"endpoint\":\"kling-video-o3-pro/image-to-video\",\"name\":\"可灵图生视频o3-pro\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":8},{\"endpoint\":\"kling-video-o3-std/text-to-video\",\"name\":\"可灵文生视频o3-std\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":8},{\"endpoint\":\"rhart-audio/text-to-audio/voice-clone\",\"name\":\"minimax/voice-clone\",\"task\":\"voice-clone\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":8},{\"endpoint\":\"seedream-v5-lite/image-to-image\",\"name\":\"seedream-v5-lite-图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":8},{\"endpoint\":\"seedream-v5-lite/text-to-image\",\"name\":\"seedream-v5-lite-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":8},{\"endpoint\":\"kling-video-o1/text-to-video\",\"name\":\"可灵文生视频o1\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":9},{\"endpoint\":\"kling-video-o3-std/image-to-video\",\"name\":\"可灵图生视频o3-std\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":9},{\"endpoint\":\"seedream-v4.5/image-to-image\",\"name\":\"seedream-v4.5-图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":9},{\"endpoint\":\"seedream-v4.5/text-to-image\",\"name\":\"seedream-v4.5-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":9},{\"endpoint\":\"kling-v2.6-pro/text-to-video\",\"name\":\"可灵文生视频2.6-pro\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":10},{\"endpoint\":\"kling-video-o1/image-to-video\",\"name\":\"可灵图生视频o1\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":10},{\"endpoint\":\"seedream-v4/image-to-image\",\"name\":\"seedream-v4-图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":10},{\"endpoint\":\"seedream-v4/text-to-image\",\"name\":\"seedream-v4-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":10},{\"endpoint\":\"kling-v2.5-turbo-pro/text-to-video\",\"name\":\"可灵文生视频2.5-turbo-pro\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":11},{\"endpoint\":\"kling-v2.6-pro/image-to-video\",\"name\":\"可灵图生视频2.6-pro\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":11},{\"endpoint\":\"rhart-image-v1/edit\",\"name\":\"全能图片V1-图生图-低价渠道版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":11},{\"endpoint\":\"rhart-image-v1/text-to-image\",\"name\":\"全能图片V1-文生图-低价渠道版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":11},{\"endpoint\":\"alibaba/qwen-image-2.0-pro/image-edit\",\"name\":\"千问2.0Pro-图像编辑\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":12},{\"endpoint\":\"kling-v2.5-turbo-pro/image-to-video\",\"name\":\"可灵图生视频2.5-turbo-pro\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":12},{\"endpoint\":\"rhart-image-v1-official/text-to-image\",\"name\":\"全能图片V1-文生图-官方稳定版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":12},{\"endpoint\":\"rhart-video-v3.1-pro/text-to-video\",\"name\":\"全能视频V3.1-pro-文生视频-低价渠道版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":12},{\"endpoint\":\"alibaba/qwen-image-2.0/image-edit\",\"name\":\"千问2.0-图像编辑\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":13},{\"endpoint\":\"kling-v2.5-turbo-std/image-to-video\",\"name\":\"可灵图生视频2.5-turbo-std\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":13},{\"endpoint\":\"rhart-image-g/text-to-image\",\"name\":\"全能图片X-文生图-低价渠道版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":13},{\"endpoint\":\"rhart-video-v3.1-fast/text-to-video\",\"name\":\"全能视频V3.1-fast-文生视频-低价渠道版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":13},{\"endpoint\":\"rhart-video-v3.1-pro-official/text-to-video\",\"name\":\"全能视频V3.1-pro-文生视频-官方稳定版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":14},{\"endpoint\":\"rhart-video-v3.1-pro/image-to-video\",\"name\":\"全能视频V3.1-pro-图生视频-低价渠道版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":14},{\"endpoint\":\"youchuan/text-to-image-v7\",\"name\":\"悠船文生图-v7\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":14},{\"endpoint\":\"rhart-video-v3.1-fast-official/text-to-video\",\"name\":\"全能视频V3.1-fast-文生视频-官方稳定版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":15},{\"endpoint\":\"rhart-video-v3.1-fast/image-to-video\",\"name\":\"全能视频V3.1-fast-图生视频-低价渠道版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":15},{\"endpoint\":\"youchuan/text-to-image-niji7\",\"name\":\"悠船文生图-niji7\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":15},{\"endpoint\":\"rhart-video-g/text-to-video\",\"name\":\"全能视频X-文生视频-低价渠道版-v1.5\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":16},{\"endpoint\":\"rhart-video-v3.1-pro-official/image-to-video\",\"name\":\"全能视频V3.1-pro-图生视频-官方稳定版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":16},{\"endpoint\":\"youchuan/text-to-image-v6\",\"name\":\"悠船文生图-v6\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":16},{\"endpoint\":\"rhart-video-g-official/text-to-video\",\"name\":\"全能视频X-文生视频-官方稳定版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":17},{\"endpoint\":\"rhart-video-v3.1-fast-official/image-to-video\",\"name\":\"全能视频V3.1-fast-图生视频-官方稳定版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":17},{\"endpoint\":\"youchuan/text-to-image-v61\",\"name\":\"悠船文生图-v61\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":17},{\"endpoint\":\"minimax/hailuo-02/t2v-pro\",\"name\":\"海螺-02-文生视频-pro\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":18},{\"endpoint\":\"rhart-video-g/image-to-video\",\"name\":\"全能视频X-图生视频-低价渠道版-v1.5\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":18},{\"endpoint\":\"youchuan/text-to-image-niji6\",\"name\":\"悠船文生图-niji6\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":18},{\"endpoint\":\"minimax/hailuo-2.3/t2v-pro\",\"name\":\"海螺-2.3-文生视频-pro\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":19},{\"endpoint\":\"rhart-image-n-g31-flash-official/text-to-image\",\"name\":\"全能图片V2-文生图-官方稳定版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":19},{\"endpoint\":\"rhart-video-g-official/image-to-video\",\"name\":\"全能视频X-图生视频-官方稳定版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":19},{\"endpoint\":\"minimax/hailuo-02/i2v-pro\",\"name\":\"海螺-02-图生视频-pro\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":20},{\"endpoint\":\"minimax/hailuo-02/t2v-standard\",\"name\":\"海螺-02-文生视频-标准\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":20},{\"endpoint\":\"rhart-image-g-1.5-official/text-to-image\",\"name\":\"全能图片G-1.5-文生图-官方稳定版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":20},{\"endpoint\":\"minimax/hailuo-02/i2v-standard\",\"name\":\"海螺-02-图生视频-标准\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":21},{\"endpoint\":\"minimax/hailuo-2.3/t2v-standard\",\"name\":\"海螺-2.3-文生视频-标准\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":21},{\"endpoint\":\"minimax/hailuo-2.3/i2v-standard\",\"name\":\"海螺-2.3-图生视频-标准\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":22},{\"endpoint\":\"vidu/text-to-video-q3-pro\",\"name\":\"Vidu-文生视频-q3-pro\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":22},{\"endpoint\":\"minimax/hailuo-2.3/image-to-video-pro\",\"name\":\"海螺-2.3-图生视频-pro\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":23},{\"endpoint\":\"vidu/text-to-video-q3-turbo\",\"name\":\"Vidu-文生视频-q3-turbo\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":23},{\"endpoint\":\"minimax/hailuo-2.3-fast/image-to-video\",\"name\":\"海螺-2.3-fast-图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":24},{\"endpoint\":\"vidu/text-to-video\",\"name\":\"Vidu-文生视频-q2\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":24},{\"endpoint\":\"alibaba/wan-2.6/text-to-video\",\"name\":\"万相2.6-文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":25},{\"endpoint\":\"minimax/hailuo-2.3-fast-pro/image-to-video\",\"name\":\"海螺-2.3-fast-pro-图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":25},{\"endpoint\":\"seedance-v1.5-pro/text-to-video\",\"name\":\"seedance-v1.5-pro-text-to-video\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":26},{\"endpoint\":\"vidu/image-to-video-q3-pro\",\"name\":\"Vidu-图生视频-q3-pro\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":26},{\"endpoint\":\"seedance-v1.5-pro/text-to-video-fast\",\"name\":\"seedance-v1.5-pro-text-to-video-fast\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":27},{\"endpoint\":\"vidu/image-to-video-q3-turbo\",\"name\":\"Vidu-图生视频-q3-turbo\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":27},{\"endpoint\":\"vidu/image-to-video-q2-pro\",\"name\":\"Vidu-图生视频-q2-pro\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":28},{\"endpoint\":\"vidu/image-to-video-q2-pro-fast\",\"name\":\"Vidu-图生视频-q2-pro-fast\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":29},{\"endpoint\":\"vidu/image-to-video-q2-turbo\",\"name\":\"Vidu-图生视频-q2-turbo\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":30},{\"endpoint\":\"alibaba/wan-2.6/image-to-video\",\"name\":\"万相2.6-图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":31},{\"endpoint\":\"alibaba/wan-2.6/image-to-video-flash\",\"name\":\"万相2.6-图生视频Flash\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":32},{\"endpoint\":\"seedance-v1.5-pro/image-to-video\",\"name\":\"seedance-v1.5-pro-image-to-video\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":33},{\"endpoint\":\"seedance-v1.5-pro/image-to-video-fast\",\"name\":\"seedance-v1.5-pro-image-to-video-fast\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":34},{\"endpoint\":\"youchuan/image-to-video\",\"name\":\"悠船图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":35},{\"endpoint\":\"alibaba/happyhorse-1.0/image-to-video\",\"name\":\"happyhorse-1.0/image-to-video\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/happyhorse-1.0/reference-to-video\",\"name\":\"happyhorse-1.0/reference-to-video\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/happyhorse-1.0/text-to-video\",\"name\":\"happyhorse-1.0/text-to-video\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/happyhorse-1.1/image-to-video\",\"name\":\"happyhorse-1.1/image-to-video\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/happyhorse-1.1/reference-to-video\",\"name\":\"happyhorse-1.1/reference-to-video\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/happyhorse-1.1/text-to-video\",\"name\":\"happyhorse-1.1/text-to-video\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/qwen-image-2.0-pro/text-to-image\",\"name\":\"千问2.0Pro-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/qwen-image-2.0/text-to-image\",\"name\":\"千问2.0-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/qwen-image-3.0-pro/image-edit\",\"name\":\"千问3.0Pro-图像编辑\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/qwen-image-3.0-pro/text-to-image\",\"name\":\"千问3.0Pro-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/qwen-image-3.0/image-edit\",\"name\":\"千问3.0-图像编辑\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/qwen-image-3.0/text-to-image\",\"name\":\"千问3.0-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/qwen3-tts-flash\",\"name\":\"千问3-语音合成-Flash\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"alibaba/qwen3-tts-instruct-flash\",\"name\":\"千问3-语音合成-Instruct-Flash\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.5-preview/image-to-image\",\"name\":\"万相2.5 Preview 图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.5-preview/image-to-video\",\"name\":\"万相2.5 Preview 图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.5-preview/text-to-image\",\"name\":\"万相2.5 Preview 文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.5-preview/text-to-video\",\"name\":\"万相2.5 Preview 文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.6/reference-to-video\",\"name\":\"万相2.6-参考生视频\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.6/reference-to-video-flash\",\"name\":\"万相2.6-参考生视频Flash\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.7-spicy/image-to-video\",\"name\":\"万相2.7-spicy-图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.7/image-edit\",\"name\":\"万相2.7-图像编辑\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.7/image-edit-pro\",\"name\":\"万相2.7-图像编辑Pro\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.7/image-to-video\",\"name\":\"万相2.7-图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.7/reference-to-video\",\"name\":\"万相2.7-参考生视频\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.7/text-to-image\",\"name\":\"万相2.7-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.7/text-to-image-pro\",\"name\":\"万相2.7-文生图Pro\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"alibaba/wan-2.7/text-to-video\",\"name\":\"万相2.7-文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/wan-3.0/image-to-video\",\"name\":\"万相3.0-图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"alibaba/wan-3.0/reference-to-video\",\"name\":\"万相3.0-参考生视频\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/doubao-seed-audio-1.0\",\"name\":\"Doubao-音频生成-1.0\",\"task\":\"audio-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"bytedance/doubao-seed-tts-2.0\",\"name\":\"Doubao-语音合成-2.0\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"bytedance/jimeng-4.6/image-to-image\",\"name\":\"即梦图片 4.6 图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"bytedance/jimeng-4.6/text-to-image\",\"name\":\"即梦图片 4.6 文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.0-global-fast/image-to-video\",\"name\":\"seedance2.0-global-fast/图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.0-global-fast/text-to-video\",\"name\":\"seedance2.0-global-fast/文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.0-global-mini/image-to-video\",\"name\":\"seedance2.0-global-Mini/图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.0-global-mini/text-to-video\",\"name\":\"seedance2.0-global-Mini/文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.0-global/image-to-video\",\"name\":\"seedance2.0-global/图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.0-global/text-to-video\",\"name\":\"seedance2.0-global/文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.5-global-token/image-to-video\",\"name\":\"seedance2.5-global/图生视频 Token\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.5-global-token/text-to-video\",\"name\":\"seedance2.5-global/文生视频 Token\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.5-token/image-to-video\",\"name\":\"seedance2.5/图生视频 Token\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"bytedance/seedance-2.5-token/text-to-video\",\"name\":\"seedance2.5/文生视频 Token\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"dola-Seedream-5.0-pro/image-to-image\",\"name\":\"Dola-Seedream-5.0-pro-图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"dola-Seedream-5.0-pro/text-to-image\",\"name\":\"Dola-Seedream-5.0-pro-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"gemini-omni-flash/image-to-video\",\"name\":\"全能视频 Omni Flash 图生视频-低价渠道版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"gemini-omni-flash/text-to-video\",\"name\":\"全能视频 Omni Flash 文生视频-低价渠道版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"higgsfield/dop/image-to-video\",\"name\":\"Higgsfield DoP 图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"higgsfield/soul/image-to-image\",\"name\":\"Higgsfield Soul 图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"kling-lip-sync/lip-sync-video\",\"name\":\"可灵对口型-视频生成\",\"task\":\"lip-sync-video\",\"output\":\"audio\",\"cap\":\"video-to-audio\",\"pop\":99},{\"endpoint\":\"kling-lip-sync/tts\",\"name\":\"可灵对口型-语音合成\",\"task\":\"text-to-speech\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"kling-v2-ai-avatar-pro/image-audio-to-video\",\"name\":\"Kling V2 Pro 数字人口播视频\",\"task\":\"lip-sync-video\",\"output\":\"audio\",\"cap\":\"video-to-audio\",\"pop\":99},{\"endpoint\":\"kling-v2-ai-avatar-standard/image-audio-to-video\",\"name\":\"Kling V2 Std 数字人口播视频\",\"task\":\"lip-sync-video\",\"output\":\"audio\",\"cap\":\"video-to-audio\",\"pop\":99},{\"endpoint\":\"kling-v2.5-turbo-std/text-to-video\",\"name\":\"可灵文生视频2.5-turbo-std\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"kling-v2.6-std/image-to-video\",\"name\":\"可灵图生视频2.6-标准版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"kling-v2.6-std/text-to-video\",\"name\":\"可灵文生视频2.6-标准版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"kling-v3-4k/image-to-video\",\"name\":\"可灵图生视频v3-4k\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"kling-v3-4k/text-to-video\",\"name\":\"可灵文生视频v3-4k\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"kling-v3-turbo-pro/image-to-video\",\"name\":\"可灵图生视频v3-turbo-pro\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"kling-v3-turbo-pro/text-to-video\",\"name\":\"可灵文生视频v3-turbo-pro\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"kling-v3-turbo-std/image-to-video\",\"name\":\"可灵图生视频v3-turbo-std\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"kling-v3-turbo-std/text-to-video\",\"name\":\"可灵文生视频v3-turbo-std\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"kling-video-o1-std/refrence-to-video\",\"name\":\"可灵参考生视频o1\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"kling-video-o1/start-to-end\",\"name\":\"可灵首尾帧生视频o1\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"kling-video-o3-4k/image-to-video\",\"name\":\"可灵图生视频o3-4k\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"kling-video-o3-4k/reference-to-video\",\"name\":\"可灵参考生视频o3-4k\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"kling-video-o3-4k/text-to-video\",\"name\":\"可灵文生视频o3-4k\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"kling-video-o3-pro/reference-to-video\",\"name\":\"kling-video-o3-pro/reference-to-video\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"kling-video-o3-std/reference-to-video\",\"name\":\"kling-video-o3-std/reference-to-video\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"luma/uni-1-max/image-edit\",\"name\":\"Luma uni-1-max 图像编辑\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"luma/uni-1-max/image-to-image\",\"name\":\"Luma uni-1-max 图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"luma/uni-1-max/text-to-image\",\"name\":\"Luma uni-1-max 文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"luma/uni-1/image-edit\",\"name\":\"Luma uni-1 图像编辑\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"luma/uni-1/image-to-image\",\"name\":\"Luma uni-1 图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"luma/uni-1/text-to-image\",\"name\":\"Luma uni-1 文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"marble-1.0/image-to-world\",\"name\":\"marble-1.0 单图生3D世界\",\"task\":\"image-to-world\",\"output\":\"image\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"marble-1.0/multi-image-to-world\",\"name\":\"marble-1.0 多图生3D世界\",\"task\":\"multi-image-to-world\",\"output\":\"image\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"marble-1.1-plus/image-to-world\",\"name\":\"marble-1.1-plus 单图生3D世界\",\"task\":\"image-to-world\",\"output\":\"image\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"marble-1.1-plus/multi-image-to-world\",\"name\":\"marble-1.1-plus 多图生3D世界\",\"task\":\"multi-image-to-world\",\"output\":\"image\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"marble-1.1/image-to-world\",\"name\":\"marble-1.1 单图生3D世界\",\"task\":\"image-to-world\",\"output\":\"image\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"marble-1.1/multi-image-to-world\",\"name\":\"marble-1.1 多图生3D世界\",\"task\":\"multi-image-to-world\",\"output\":\"image\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"minimax/hailuo-h3/image-to-video\",\"name\":\"MiniMax-H3 图生视频（首尾帧）\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"minimax/hailuo-h3/regeneration-image-to-video\",\"name\":\"MiniMax-H3 图生视频再生成(768P→2K)\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"minimax/hailuo-h3/regeneration-text-to-video\",\"name\":\"MiniMax-H3 文生视频再生成(768P→2K)\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"minimax/hailuo-h3/text-to-video\",\"name\":\"MiniMax-H3 文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"minimax/music-2.6\",\"name\":\"MiniMax Music 2.6\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"minimax/music-cover\",\"name\":\"MiniMax Music 翻唱\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"minimax/music-cover-preprocess\",\"name\":\"MiniMax Music 翻唱前处理\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"minimax/voice-design\",\"name\":\"minimax-音色设计\",\"task\":\"voice-design\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"mureka-ai/mureka-o2/generate-song\",\"name\":\"Mureka-o2 歌曲生成\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"mureka-ai/mureka-v7.6/generate-bgm\",\"name\":\"Mureka-v7.6 伴奏生成\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"mureka-ai/mureka-v7.6/generate-song\",\"name\":\"Mureka-v7.6 歌曲生成\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"mureka-ai/mureka-v8/generate-bgm\",\"name\":\"Mureka-v8 伴奏生成\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"mureka-ai/mureka-v8/generate-song\",\"name\":\"Mureka-v8 歌曲生成\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"mureka-ai/mureka-v9/generate-bgm\",\"name\":\"Mureka-v9 伴奏生成\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"mureka-ai/mureka-v9/generate-song\",\"name\":\"Mureka-v9 歌曲生成\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"mureka-ai/vocal-clone\",\"name\":\"Mureka 人声克隆\",\"task\":\"voice-clone\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"mureka-o2/instrumental-generate\",\"name\":\"Mureka mureka-o2 伴奏生成-暂不可用\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"pixverse-c1/image-to-video\",\"name\":\"PixVerse C1 图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"pixverse-c1/reference-to-video\",\"name\":\"PixVerse C1 参考生视频\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"pixverse-c1/text-to-video\",\"name\":\"PixVerse C1 文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"pixverse-v5.5/image-to-video\",\"name\":\"PixVerse V5.5 图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"pixverse-v5.5/text-to-video\",\"name\":\"PixVerse V5.5 文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"pixverse-v5.6/image-to-video\",\"name\":\"PixVerse V5.6 图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"pixverse-v5.6/text-to-video\",\"name\":\"PixVerse V5.6 文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"pixverse-v6/image-to-video\",\"name\":\"PixVerse V6 图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"pixverse-v6/text-to-video\",\"name\":\"PixVerse V6 文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"rhart-audio/suno-v4.5/custom\",\"name\":\"suno-custom-v4.5\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"rhart-audio/suno-v4.5/single\",\"name\":\"suno-single-v4.5\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"rhart-audio/suno-v5.5/custom\",\"name\":\"suno-custom-v5.5\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"rhart-audio/suno-v5.5/single\",\"name\":\"suno-single-v5.5\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"rhart-audio/suno-v5/custom\",\"name\":\"suno-custom-v5\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"rhart-audio/suno-v5/single\",\"name\":\"suno-single-v5\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"rhart-audio/suno/lyrics\",\"name\":\"suno-歌词生成\",\"task\":\"music-generation\",\"output\":\"audio\",\"cap\":\"text-to-audio\",\"pop\":99},{\"endpoint\":\"rhart-image-g-1.5-official/image-to-image\",\"name\":\"全能图片G-1.5-图生图-官方稳定版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-g-2-official/image-to-image\",\"name\":\"全能图片G-2-图生图-官方稳定版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-g-2-official/text-to-image\",\"name\":\"全能图片G-2-文生图-官方稳定版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-g-2/image-to-image\",\"name\":\"全能图片G-2.0-图生图-低价渠道版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-g-2/text-to-image\",\"name\":\"全能图片G-2.0-文生图-低价渠道版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-g/image-to-image\",\"name\":\"全能图片X-图生图-低价渠道版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-n-g31-flash-lite-official/image-to-image\",\"name\":\"全能图片V2-lite-图生图-官方稳定版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-n-g31-flash-lite-official/text-to-image\",\"name\":\"全能图片V2-lite-文生图-官方稳定版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-n-g31-flash-lite/image-to-image\",\"name\":\"全能图片V2-lite-图生图-低价渠道版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-n-g31-flash-lite/text-to-image\",\"name\":\"全能图片V2-lite-文生图-低价渠道版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-n-g31-flash-official/image-to-image\",\"name\":\"全能图片V2-图生图-官方稳定版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-v1-official/edit\",\"name\":\"全能图片V1-图生图-官方稳定版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-x-official/edit\",\"name\":\"全能图片X-图片编辑-官方稳定版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-image-x-official/text-to-image\",\"name\":\"全能图片X-文生图片-官方稳定版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"rhart-imagine-image-quality/edit\",\"name\":\"全能图片X-高质量图片编辑-官方稳定版\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"rhart-imagine-image-quality/text-to-image\",\"name\":\"全能图片X-高质量文生图-官方稳定版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"rhart-video-flux3/image-to-video\",\"name\":\"FLUX 3 Video 图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-flux3/text-to-video\",\"name\":\"FLUX 3 Video 文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-g-official/image-to-video-v1.5\",\"name\":\"全能视频X-图生视频-官方稳定版-v1.5\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-g-official/reference-to-video\",\"name\":\"全能视频X-多图参考生视频-官方稳定版\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-g-official/reference-to-video-v1.5\",\"name\":\"全能视频X-参考生视频-官方稳定版-v1.5\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-g-official/text-to-video-v1.5\",\"name\":\"全能视频X-文生视频-官方稳定版-v1.5\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-r/gen4-turbo-official/image-to-video\",\"name\":\"全能视频R/gen4-turbo/图生视频-官方稳定版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-r/gen4-turbo/image-to-video\",\"name\":\"全能视频R/gen4-turbo/图生视频-低价渠道版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-s/image-to-video-asyn\",\"name\":\"全能视频S-图生视频（异步）-低价渠道版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-s/image-to-video-pro-deprecated\",\"name\":\"全能视频S-图生视频-pro-低价渠道版-已下架\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-s/text-to-video-pro-deprecated\",\"name\":\"全能视频S-文生视频-pro-低价渠道版-已下架\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-v3.1-fast-official/reference-to-video\",\"name\":\"全能视频V3.1-fast-参考生视频-官方稳定版\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-v3.1-fast/start-end-to-video\",\"name\":\"全能视频V3.1-fast-首尾帧生视频-低价渠道版\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"rhart-video-v3.1-lite-official/image-to-video\",\"name\":\"全能视频V3.1-Lite图生视频-官方稳定版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-v3.1-lite-official/start-end-to-video\",\"name\":\"全能视频V3.1-Lite首尾帧生视频-官方稳定版\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"rhart-video-v3.1-lite-official/text-to-video\",\"name\":\"全能视频V3.1-Lite文生视频-官方稳定版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-v3.1-lite/image-to-video\",\"name\":\"全能视频V3.1-lite-图生视频-低价渠道版\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-v3.1-lite/text-to-video\",\"name\":\"全能视频V3.1-lite-文生视频-低价渠道版\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-v3.1-pro-official/reference-to-video\",\"name\":\"全能视频V3.1-pro-参考生视频-官方稳定版\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video-v3.1-pro/start-end-to-video\",\"name\":\"全能视频V3.1-pro-首尾帧生视频-低价渠道版\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"rhart-video/ltx-2/text-to-video-lora\",\"name\":\"ltx-2-19b/text-to-video-lora\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video/sparkvideo-2.0-fast/image-to-video\",\"name\":\"Seedance2.0-Fast/图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video/sparkvideo-2.0-fast/text-to-video\",\"name\":\"Seedance2.0-Fast/文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video/sparkvideo-2.0-mini/image-to-video\",\"name\":\"seedance2.0-Mini/图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video/sparkvideo-2.0-mini/text-to-video\",\"name\":\"seedance2.0-Mini/文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video/sparkvideo-2.0/image-to-video\",\"name\":\"Seedance2.0/图生视频\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"rhart-video/sparkvideo-2.0/text-to-video\",\"name\":\"Seedance2.0/文生视频\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"seedance-v1-lite/reference-to-video\",\"name\":\"seedance-v1-lite-reference-to-video\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"seedream-v5-pro/image-to-image\",\"name\":\"seedream-v5-pro-图生图\",\"task\":\"image-to-image\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"seedream-v5-pro/text-to-image\",\"name\":\"seedream-v5-pro-文生图\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"skyreels-v3/reference-to-video\",\"name\":\"SkyReels V3 参考图生视频\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"skyreels-v4/image-to-video-fast\",\"name\":\"SkyReels V4 图生视频-fast\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"skyreels-v4/image-to-video-std\",\"name\":\"SkyReels V4 图生视频-std\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"skyreels-v4/omni-reference-fast\",\"name\":\"SkyReels V4 Omni 参考视频-fast\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"skyreels-v4/omni-reference-std\",\"name\":\"SkyReels V4 Omni 参考视频-std\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"skyreels-v4/text-to-video-fast\",\"name\":\"SkyReels V4 文生视频-fast\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"skyreels-v4/text-to-video-std\",\"name\":\"SkyReels V4 文生视频-std\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"topazlabs/image-gigapixel-art-and-cgi\",\"name\":\"topazlabs图像放大Art and CGI\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"topazlabs/image-gigapixel-high-fidelity-2\",\"name\":\"topazlabs图像放大High Fidelity v2\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"topazlabs/image-gigapixel-low-resolution-2\",\"name\":\"topazlabs图像放大Low Resolution v2\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"topazlabs/image-gigapixel-standard-2\",\"name\":\"topazlabs图像放大Standard v2\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"topazlabs/image-gigapixel-text-and-shapes\",\"name\":\"topazlabs图像放大Text and Shapes\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"topazlabs/image-upscale-detail-faces\",\"name\":\"topazlabs图像放大Detail Faces\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"topazlabs/image-upscale-high-fidelity-v3\",\"name\":\"topazlabs图像放大High Fidelity V3\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"topazlabs/image-upscale-transparent\",\"name\":\"topazlabs图像放大Transparent\",\"task\":\"image-upscale\",\"output\":\"image\",\"cap\":\"image-to-image\",\"pop\":99},{\"endpoint\":\"vidu/image-to-video-q3-pro-fast\",\"name\":\"Vidu-图生视频-q3-pro-fast\",\"task\":\"image-to-video\",\"output\":\"video\",\"cap\":\"image-to-video\",\"pop\":99},{\"endpoint\":\"vidu/reference-to-video-q2\",\"name\":\"Vidu-参考生视频-q2\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"vidu/reference-to-video-q2-pro\",\"name\":\"Vidu-参考生视频-q2-pro\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"vidu/reference-to-video-q3\",\"name\":\"Vidu-参考生视频-q3\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"vidu/reference-to-video-q3-ad\",\"name\":\"Vidu-参考生视频-q3-ad\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"vidu/reference-to-video-q3-drama\",\"name\":\"Vidu-参考生视频-q3-drama\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"vidu/reference-to-video-q3-mix\",\"name\":\"Vidu-参考生视频-q3-mix\",\"task\":\"reference-to-video\",\"output\":\"video\",\"cap\":\"multi-image-to-video\",\"pop\":99},{\"endpoint\":\"vidu/start-end-to-video-q2-pro\",\"name\":\"Vidu-首尾帧生视频-q2-pro\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"vidu/start-end-to-video-q2-pro-fast\",\"name\":\"Vidu-首尾帧生视频-q2-pro-fast\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"vidu/start-end-to-video-q2-turbo\",\"name\":\"Vidu-首尾帧生视频-q2-turbo\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"vidu/start-end-to-video-q3-pro\",\"name\":\"Vidu-首尾帧生视频-q3-pro\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"vidu/start-end-to-video-q3-pro-fast\",\"name\":\"Vidu-首尾帧生视频-q3-pro-fast\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"vidu/start-end-to-video-q3-turbo\",\"name\":\"Vidu-首尾帧生视频-q3-turbo\",\"task\":\"start-end-to-video\",\"output\":\"video\",\"cap\":\"first-last-frame-video\",\"pop\":99},{\"endpoint\":\"vidu/text-to-video-q3-pro-fast\",\"name\":\"Vidu-文生视频-q3-pro-fast\",\"task\":\"text-to-video\",\"output\":\"video\",\"cap\":\"text-to-video\",\"pop\":99},{\"endpoint\":\"youchuan/text-to-image-v8.2-fast\",\"name\":\"悠船文生图-v8.2-快速\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"youchuan/text-to-image-v8.2-turbo\",\"name\":\"悠船文生图-v8.2-极速\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"youchuan/text-to-image-v81\",\"name\":\"悠船文生图-v8.1\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99},{\"endpoint\":\"youchuan/text-to-image-v82\",\"name\":\"悠船文生图-v8.2预览版\",\"task\":\"text-to-image\",\"output\":\"image\",\"cap\":\"text-to-image\",\"pop\":99}]}");
        const RH_OUTPUT_TYPES = ["image", "video", "audio"];
        const RH_FAMILY_STRIP = /(Token|text-to-video|image-to-video|text-to-image|image-to-image|reference-to-video|start-end-to-video|text-to-speech|music-generation|audio-generation|voice-clone|voice-design|image-edit|image-upscale|image-to-world|multi-image-to-world|lip-sync-video|文生视频|图生视频|首尾帧生视频|多图参考生视频|参考生视频|多模态视频|文生图片|文生图|图生图|参考生图|图像放大|图片编辑|图像编辑|视频编辑|视频转绘|视频延展|音频生成|语音合成|歌曲生成|伴奏生成|歌词生成|人声克隆|声音克隆|音色设计|翻唱|对口型|数字人口播|生3D世界|再生成|异步)/g;
        const rhBuildFamilies = (endpoints) => {
            const map = new Map();
            for (const e of endpoints) {
                let key = String(e.name || e.endpoint).replace(RH_FAMILY_STRIP, "");
                key = key.replace(/[\s/—]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
                if (!key) key = String(e.name || e.endpoint);
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(e);
            }
            return Array.from(map.entries()).map(([name, eps]) => ({ name, eps, pop: Math.min(...eps.map((e) => e.pop ?? 99)) })).sort((a, b) => a.pop - b.pop || a.name.localeCompare(b.name));
        };
        const CAP_TYPES = [["text-to-image", "capT2I"], ["image-to-image", "capI2I"], ["text-to-video", "capT2V"], ["image-to-video", "capI2V"], ["first-last-frame-video", "capFLF"], ["multi-image-to-video", "capMI2V"], ["image-and-video-to-video", "capIV2V"], ["video-to-audio", "capV2A"], ["text-to-audio", "capT2A"], ["text-to-music", "capT2M"], ["image-upscale", "capIUp"], ["video-upscale", "capVUp"], ["remove-background", "capRBG"], ["image-to-3d", "capI2D"]];
        const capLabelWithT = (id, t) => { const row = CAP_TYPES.find((r2) => r2[0] === id); return row && typeof t === 'function' ? t(row[1]) : id; };
        function MediaSection(props) {
            const { t, loadOverview, setRecipeEnabled, setCapabilityDefault, updateRecipe, listProviders, setProviderConfig, importWorkflow, autoImportComfy, autoImportRunningHub, addOpenRouter, addRunningHubApp, addRunningHubEndpoint, verifyRunningHubKey, resolveOpenRouterModel, refreshRhCatalog, deleteRecipe, updateRecipeMeta, inspectWorkflowNodes } = props;
            // 非阻塞加载：有缓存直接渲染缓存，无缓存显示骨架并等远程数据
            const [state, setState] = react.useState(() => overviewCache
                ? { status: "ready", data: overviewCache, pending: false }
                : { status: "ready", data: emptyOverview(), pending: true });
            const [dragOver, setDragOver] = react.useState(false);
            const [request, setRequest] = react.useState(0);
            const [busyKey, setBusyKey] = react.useState(null);
            const [ops, setOps] = react.useState({});
            react.useEffect(() => {
                let current = true;
                // 仅首次（无缓存）显示 loading 文案
                if (!overviewCache)
                    setState((prev) => (prev.status === "ready" ? { ...prev, pending: true } : { status: "loading" }));
                Promise.resolve().then(() => loadOverview()).then((snapshot) => {
                    if (!current)
                        return;
                    overviewCache = snapshot;
                    setState({ status: "ready", data: snapshot, pending: false });

                }, (err) => {
                    if (!current)
                        return;
                    console.warn("[MMR] overview load failed:", err);
                    // 有缓存时静默保留已有数据（只标记 loadError），避免闪白屏；
                    // 仅在首次加载完全无数据时才显示错误页。
                    if (overviewCache) {
                        setState({ status: "ready", data: overviewCache, pending: false, loadError: true });
                    } else {
                        setState((prev) => (prev.status === "ready" && prev.data ? { ...prev, pending: false, loadError: true } : { status: "error" }));
                    }
                });
                return () => {
                    current = false;
                };
            }, [loadOverview, request]);
            const patchRow = (recipeId, mutate) => {
                setState((prev) => {
                    if (prev.status !== "ready")
                        return prev;
                    return {
                        status: "ready",
                        data: {
                            ...prev.data,
                            capabilities: prev.data.capabilities.map((g) => ({
                                ...g,
                                recipes: g.recipes.map((r) => (r.id === recipeId ? mutate(r) : r))
                            }))
                        }
                    };
                });
            };
            const runOp = async (key, fn) => {
                setBusyKey(key);
                setOps((prev) => ({ ...prev, [key]: { status: "busy" } }));
                try {
                    await fn();
                    setOps((prev) => ({ ...prev, [key]: { status: "ok" } }));
                    return true;
                }
                catch {
                    setOps((prev) => ({ ...prev, [key]: { status: "error" } }));
                    return false;
                }
                finally {
                    setBusyKey(null);
                }
            };
            const applyEnabled = (row) => {
                const target = row.enabled !== true;
                patchRow(row.id, (r) => ({ ...r, enabled: target }));
                runOp(row.id, () => setRecipeEnabled({ recipeId: row.id, enabled: target })).then((result) => {
                    // 以服务端返回为准回写，避免乐观更新留下"幽灵"停用态（卡片变灰不恢复）
                    const truth = result && typeof result.enabled === "boolean" ? result.enabled : target;
                    patchRow(row.id, (x) => ({ ...x, enabled: truth }));
                }, () => {
                    patchRow(row.id, (x) => ({ ...x, enabled: !target }));
                });
            };
            const applyDefault = (capability, row) => {
                const nextDefault = row.isDefault ? null : row.id;
                setState((prev) => {
                    if (prev.status !== "ready")
                        return prev;
                    return {
                        status: "ready",
                        data: {
                            ...prev.data,
                            capabilities: prev.data.capabilities.map((g) => g.type === capability
                                ? {
                                    ...g,
                                    recipes: g.recipes.map((r) => ({ ...r, isDefault: r.id === nextDefault }))
                                }
                                : g)
                        }
                    };
                });
                void runOp(capability + ":default", () => setCapabilityDefault({ capability, recipeId: nextDefault }));
            };
            const applyRename = async (row) => {
                const ans = window.prompt(t("renamePrompt"), row.name);
                if (ans === null)
                    return;
                const n = ans.trim();
                if (!n || n === row.name)
                    return;
                patchRow(row.id, (r) => ({ ...r, name: n }));
                const ok = await runOp("rename:" + row.id, () => updateRecipe({ recipeId: row.id, name: n }));
                if (!ok)
                    patchRow(row.id, (r) => ({ ...r, name: row.name }));
            };
            const applyCapability = async (row, newCap) => {
                if (!newCap || newCap === row.capability) return;
                const r = await autoRun("cap:" + row.id, () => updateRecipeMeta({ recipeId: row.id, capability: [newCap] }));
                if (r.ok) {
                    setAutoMsg({ ok: true, text: "已更改能力分类 · " + capLabel(newCap) + "（" + (row.name || row.id) + "）" });
                    setRequest((v) => v + 1);
                } else {
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };
                        const applyDefaults = async (row, defaults) => {
                const r = await autoRun("params:" + row.id, () => updateRecipe({ recipeId: row.id, defaults }));
                if (r.ok) {
                    setAutoMsg({ ok: true, text: "已保存工作流参数 · " + (row.name || row.id) });
                    setRequest((v) => v + 1);
                } else {
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };
            const applyDelete = async (row) => {
                if (!window.confirm("确定删除工作流「" + (row.name || row.id) + "」吗？删除后不可恢复。")) return;
                const r = await autoRun("delete:" + row.id, () => deleteRecipe({ recipeId: row.id }));
                if (r.ok) {
                    setAutoMsg({ ok: true, text: "已删除工作流 · " + (row.name || row.id) });
                    setRequest((v) => v + 1);
                } else {
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };

            const capLabel = (id) => capLabelWithT(id, t);
            const [provs, setProvs] = react.useState([]);
            const [keyDrafts, setKeyDrafts] = react.useState({});
            const [imp, setImp] = react.useState({ name: "" });
            const [jsonText, setJsonText] = react.useState("");
            const [impMsg, setImpMsg] = react.useState(null);
            const [detected, setDetected] = react.useState(null);
            const [rhUrl, setRhUrl] = react.useState("");
            const [rhAppUrl, setRhAppUrl] = react.useState("");
            const [rhAppNode, setRhAppNode] = react.useState("");
            const [rhAppCap, setRhAppCap] = react.useState("text-to-image");
            const [rhEndpoint, setRhEndpoint] = react.useState("");
            const [rhEndpointCap, setRhEndpointCap] = react.useState("text-to-image");
            const [rhCat, setRhCat] = react.useState("all");
            const [rhSearch, setRhSearch] = react.useState("");
            const [rhCatalogVer, setRhCatalogVer] = react.useState(0);
            const [rhVerified, setRhVerified] = react.useState({});
            // RunningHub region 选择：消费级/企业级各自独立选择国内版(cn)/国际版(global)
            const [rhRegion, setRhRegion] = react.useState({ consumer: "cn", enterprise: "cn" });
            const [orModel, setOrModel] = react.useState("");
            const [orCap, setOrCap] = react.useState("text-to-image");
            const [orResolved, setOrResolved] = react.useState(null);
            const [autoMsg, setAutoMsg] = react.useState(null);
            const fileRef = react.useRef(null);
            // 能力自动识别：扫描 workflow JSON 里的节点 class_type，预勾选能力复选框（可手动改）。
            const detectCaps = (text) => {
                const caps = [];
                let types = [];
                try {
                    const wf = JSON.parse(text);
                    if (wf && typeof wf === "object")
                        types = Object.values(wf).map((n) => (n && typeof n === "object" ? String(n.class_type || n.type || "") : "")).filter(Boolean);
                }
                catch {
                    return caps;
                }
                const has = (re) => types.some((x) => re.test(x));
                const nImages = types.filter((x) => /LoadImage/i.test(x)).length;
                const videoish = has(/WanImageToVideo|ImageToVideo|SVD|VideoCombine|AnimateDiff|I2V/i);
                if (has(/FirstLast|FLF/i) && videoish)
                    caps.push("first-last-frame-video");
                if (videoish && nImages >= 3)
                    caps.push("multi-image-to-video");
                else if (videoish && nImages >= 1)
                    caps.push("image-to-video");
                if (has(/SaveAudio|EncodeAudio|MusicGen|StableAudio|AudioOutput/i))
                    caps.push(has(/LoadVideo|VideoInput|LoadVideoUpload/i) ? "video-to-audio" : "text-to-audio");
                if (caps.length === 0 && nImages === 0 && has(/WanTextToVideo|TextToVideo|EmptyHunyuanLatentVideo|EmptyMochiLatent|LTXV/i))
                    caps.push("text-to-video");
                if (caps.length === 0) {
                    if (nImages >= 1 && has(/CheckpointLoader|UNETLoader|VAELoader|KSampler/i))
                        caps.push("image-to-image");
                    else if (has(/CheckpointLoader|UNETLoader|EmptyLatentImage|KSampler/i))
                        caps.push("text-to-image");
                }
                return caps;
            };
            const readWorkflowFile = (file) => {
                if (!file)
                    return;
                setImp((prev) => ({ ...prev, name: prev.name || file.name.replace(/\.json$/i, "") }));
                const reader = new FileReader();
                reader.onload = () => {
                    const text = String(reader.result ?? "");
                    setJsonText(text);
                    setDetected(detectCaps(text));
                };
                reader.readAsText(file);
            };
            react.useEffect(() => {
                let current = true;
                Promise.resolve().then(() => listProviders()).then((r) => {
                    if (current)
                        setProvs(Array.isArray(r.providers) ? r.providers : []);
                }, () => { });
                return () => { current = false; };
            }, [listProviders, request]);
            const applyKey = async (pid, value, scope, region) => {
                try {
                    const provider = scope === "enterprise" ? "runninghub-enterprise" : scope === "consumer" ? "runninghub" : pid;
                    const payload = { provider, apiKey: value };
                    if (scope) payload.scope = scope;
                    if (region) payload.region = region;
                    await runOp("prov:" + pid, () => setProviderConfig(payload));
                    const fresh = await Promise.resolve().then(() => listProviders()).catch(() => ({ providers: [] }));
                    setProvs(Array.isArray(fresh?.providers) ? fresh.providers : []);
                    setKeyDrafts((prev) => ({ ...prev, [pid]: "" }));
                    setRequest((v) => v + 1);
                } catch (e) {
                    console.error("[MMR] applyKey error:", e);
                }
            };
            const doImport = async () => {
                const caps = (detected && detected.length > 0 ? detected : detectCaps(jsonText));
                if (!imp.name.trim() || !jsonText.trim()) {
                    setImpMsg({ ok: false, text: t("needNameAndCaps") });
                    return;
                }
                try {
                    JSON.parse(jsonText);
                }
                catch {
                    setImpMsg({ ok: false, text: t("importBadJson") });
                    return;
                }
                const effectiveCaps = caps.length > 0 ? caps : ["text-to-image"];
                try {
                    await importWorkflow({ name: imp.name.trim(), capability: effectiveCaps, provider: "comfy-local", workflowJson: jsonText, setAsDefault: true });
                    setImpMsg({ ok: true, text: t("importDone") });
                    setJsonText("");
                    setDetected(null);
                    setRequest((v) => v + 1);
                }
                catch (e) {
                    setImpMsg({ ok: false, text: String(e && e.message ? e.message : e) });
                }
            };
            // 自动导入辅助：捕获结果/错误返回，供 ComfyUI/RunningHub/OpenRouter 三条自动导入路径复用
            const autoRun = async (key, fn) => {
                setBusyKey(key);
                setOps((prev) => ({ ...prev, [key]: { status: "busy" } }));
                try {
                    const value = await fn();
                    setOps((prev) => ({ ...prev, [key]: { status: "ok" } }));
                    return { ok: true, value };
                }
                catch (e) {
                    setOps((prev) => ({ ...prev, [key]: { status: "error" } }));
                    return { ok: false, error: e };
                }
                finally {
                    setBusyKey(null);
                }
            };
            const capsText = (value) => (Array.isArray(value?.capability) ? " · " + value.capability.map(capLabel).join(t("detectJoin")) : "");
            const doAutoComfy = async () => {
                let nm = imp.name.trim();
                if (!nm) {
                    const ans = window.prompt(t("comfyNamePrompt"), "");
                    if (ans === null)
                        return;
                    nm = ans.trim();
                }
                const r = await autoRun("autoComfy", () => autoImportComfy({ name: nm || undefined }));
                if (r.ok) {
                    setAutoMsg({ ok: true, text: t("importDone") + capsText(r.value) });
                    setRequest((v) => v + 1);
                }
                else {
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };
            const doAutoRh = async () => {
                if (!rhUrl.trim()) {
                    setAutoMsg({ ok: false, text: t("needRhUrl") });
                    return;
                }
                const r = await autoRun("autoRh", () => autoImportRunningHub({ workflowUrl: rhUrl.trim() }));
                if (r.ok) {
                    setAutoMsg({ ok: true, text: t("importDone") + capsText(r.value) });
                    setRhUrl("");
                    setRequest((v) => v + 1);
                }
                else {
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };
            const rhFamilies = react.useMemo(() => rhBuildFamilies(RH_ENDPOINTS.endpoints), [rhCatalogVer]);
            // 端点目录过滤：分类 + 关键词（中文名/端点ID，忽略大小写），最多展示 40 个家族（列表区滚动）
            const rhFamMatches = react.useMemo(() => {
                const q = rhSearch.trim().toLowerCase();
                const out = [];
                for (const f of rhFamilies) {
                    const eps = f.eps.filter((e) => (rhCat === "all" || e.output === rhCat) &&
                        (q === "" || e.name.toLowerCase().includes(q) || e.endpoint.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)));
                    if (eps.length > 0) out.push({ name: f.name, eps });
                    if (out.length >= 40) break;
                }
                return out;
            }, [rhCat, rhSearch, rhFamilies]);
            const importRhEp = async (endpoint, capability, label) => {
                const ent = rhVerified["runninghub-enterprise"];
                if (ent && ent.valid && ent.apiTypeLabel !== "企业级-共享") {
                    setAutoMsg({ ok: false, text: t("rhWarnConsumer") + " " + ent.apiTypeLabel });
                }
                const r = await autoRun("addRhEndpoint", () => addRunningHubEndpoint({ endpoint, capability, region: rhRegion.enterprise }));
                if (r.ok) {
                    setAutoMsg({ ok: true, text: t("importDone") + " · " + label });
                    setRequest((v) => v + 1);
                    return true;
                }
                setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                return false;
            };
            const doRefreshCatalog = async () => {
                const r = await autoRun("rhCatalog", () => refreshRhCatalog({ region: rhRegion.enterprise }));
                if (r.ok) {
                    RH_ENDPOINTS.version = r.value.version;
                    RH_ENDPOINTS.count = r.value.count;
                    RH_ENDPOINTS.endpoints = r.value.endpoints;
                    setRhCatalogVer((v) => v + 1);
                    setAutoMsg({ ok: true, text: t("rhRefreshOk").replace("{n}", String(r.value.count)) });
                }
                else {
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };
            const doVerifyRhKey = async (pid, scope, region) => {
                const provider = scope === "enterprise" ? "runninghub-enterprise" : "runninghub";
                const r = await autoRun("verifyRh:" + pid, () => verifyRunningHubKey({ apiKey: (keyDrafts[pid] ?? "").trim() || undefined, provider, region: region || (pid === "runninghub-global" ? "global" : "cn") }));
                if (r.ok) {
                    setRhVerified((prev) => ({ ...prev, [pid]: r.value }));
                    setAutoMsg(r.value.valid
                        ? { ok: true, text: t("rhKeyOk") + " · " + (r.value.apiTypeLabel ?? "") + " · " + t("balance") + " " + (r.value.balance ?? "?") + " " + (r.value.currency ?? "") }
                        : { ok: false, text: String(r.value.message ?? "验证失败") });
                }
                else {
                    setRhVerified((prev) => ({ ...prev, [pid]: null }));
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };
            const doResolveOr = async () => {
                if (!orModel.trim()) {
                    setAutoMsg({ ok: false, text: t("needModel") });
                    return;
                }
                const r = await autoRun("resolveOr", () => resolveOpenRouterModel({ model: orModel.trim() }));
                if (r.ok) {
                    setOrResolved(r.value);
                    setOrCap(r.value.capability);
                    setAutoMsg({ ok: true, text: (r.value.name ?? r.value.model) + " · " + (r.value.modalities ?? []).join("/") });
                }
                else {
                    setOrResolved(null);
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };            const doAddRhApp = async () => {
                if (!rhAppUrl.trim()) {
                    setAutoMsg({ ok: false, text: t("needAppUrl") });
                    return;
                }
                const r = await autoRun("addRhApp", () => addRunningHubApp({ appUrl: rhAppUrl.trim(), capability: rhAppCap, region: rhRegion.consumer }));
                if (r.ok) {
                    setAutoMsg({ ok: true, text: t("importDone") + capsText(r.value) });
                    setRhAppUrl("");
                    setRequest((v) => v + 1);
                }
                else {
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };
            const doAddRhEndpoint = async () => {
                if (!rhEndpoint.trim()) {
                    setAutoMsg({ ok: false, text: t("needEndpoint") });
                    return;
                }
                const ok = await importRhEp(rhEndpoint.trim(), rhEndpointCap, rhEndpoint.trim());
                if (ok) setRhEndpoint("");
            };            const doAddModel = async () => {
                if (!orModel.trim()) {
                    setAutoMsg({ ok: false, text: t("needModel") });
                    return;
                }
                const r = await autoRun("addModel", () => addOpenRouter({ model: orModel.trim(), capability: orCap }));
                if (r.ok) {
                    setAutoMsg({ ok: true, text: t("importDone") + " · " + (r.value && r.value.name ? r.value.name : orModel.trim()) });
                    setOrModel("");
                    setRequest((v) => v + 1);
                }
                else {
                    setAutoMsg({ ok: false, text: String(r.error && r.error.message ? r.error.message : r.error) });
                }
            };
            if (state?.status === "error")
                return (0, react_jsx_runtime.jsx)("div", { className: "MMR_section", children: (0, react_jsx_runtime.jsxs)("div", { className: "MMR_failure", children: [(0, react_jsx_runtime.jsx)("p", { children: t("error") }), (0, react_jsx_runtime.jsx)("button", { type: "button", className: "MMR_refreshBtn", onClick: () => setRequest((v) => v + 1), children: t("retry") })] }) });
            const data = state?.data ?? emptyOverview();
            const pending = state?.pending === true;
            const entProvMissing = (() => { const ent = (provs || []).find((p) => p && p.id === "runninghub-enterprise"); return Boolean(ent && !ent.configured); })();
            const capabilities = Array.isArray(data?.capabilities) ? data.capabilities : [];

            return (0, react_jsx_runtime.jsxs)("div", {
                className: "MMR_section",
                children: [
                    (0, react_jsx_runtime.jsxs)("div", {
                        className: "MMR_headRow",
                        children: [
                            (0, react_jsx_runtime.jsx)("h3", { className: "MMR_title", children: t("title") }),
                            (0, react_jsx_runtime.jsxs)("span", {
                                className: "MMR_provider",
                                children: [
                                    (0, react_jsx_runtime.jsx)("span", {
                                        className: "MMR_dot",
                                        "data-on": data.providerOnline ? "true" : void 0
                                    }),
                                    data.providerOnline ? t("online") : t("offline"),
                                    (0, react_jsx_runtime.jsx)("button", {
                                        type: "button",
                                        className: "MMR_refreshBtn",
                                        onClick: () => setRequest((v) => v + 1),
                                        children: t("refresh")
                                    })
                                ]
                            })
                        ]
                    }),
                    (state.loadError ? (0, react_jsx_runtime.jsx)("p", { className: "MMR_failure", children: t("error") }) : null),
                    (0, react_jsx_runtime.jsxs)("div", {
                        className: "MMR_group",
                        children: [
                            (0, react_jsx_runtime.jsx)("div", { className: "MMR_groupTitle", children: (0, react_jsx_runtime.jsx)("h4", { children: t("importLabel") }) }),
                            (0, react_jsx_runtime.jsxs)("div", {
                                className: "MMR_card",
                                children: [
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        className: "MMR_cardHead",
                                        children: [
                                            (0, react_jsx_runtime.jsx)("span", { className: "MMR_name", children: "ComfyUI" }),
                                            (0, react_jsx_runtime.jsx)("span", { className: "MMR_idTag", children: "comfy-local" })
                                        ]
                                    }),
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
                                        children: [
                                            (0, react_jsx_runtime.jsx)("input", {
                                                className: "MMR_input",
                                                type: "text",
                                                placeholder: t("importName"),
                                                style: { maxWidth: "240px" },
                                                value: imp.name,
                                                onChange: (event) => {
                                                    const val = event.target.value;
                                                    setImp((prev) => ({ ...prev, name: val }));
                                                }
                                            }),
                                            (0, react_jsx_runtime.jsx)("button", {
                                                type: "button",
                                                className: "MMR_saveBtn",
                                                disabled: busyKey === "autoComfy",
                                                onClick: () => void doAutoComfy(),
                                                children: t("autoReadComfy")
                                            })
                                        ]
                                    }),
                                    (0, react_jsx_runtime.jsx)("p", { className: "MMR_hint", children: t("autoReadComfyHint") }),
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        className: "MMR_drop",
                                        // 自声明原生拖放区：dsh-file-intake 等窗口级拦截器据此放行，
                                        // 工作流 JSON 拖入不再被抢成附件卡片
                                        "data-dsh-native-dropzone": "true",
                                        "data-over": dragOver ? "true" : void 0,
                                        onClick: () => { if (fileRef.current) fileRef.current.click(); },
                                        onDragOver: (event) => { event.preventDefault(); setDragOver(true); },
                                        onDragLeave: () => setDragOver(false),
                                        onDrop: (event) => {
                                            event.preventDefault();
                                            setDragOver(false);
                                            const file = event.dataTransfer.files && event.dataTransfer.files[0];
                                            readWorkflowFile(file);
                                        },
                                        children: jsonText.trim() ? t("dropLoaded") : t("manualImport")
                                    }),
                                    (0, react_jsx_runtime.jsx)("input", {
                                        ref: fileRef,
                                        type: "file",
                                        accept: ".json,application/json",
                                        style: { display: "none" },
                                        onChange: (event) => {
                                            const file = event.currentTarget.files && event.currentTarget.files[0];
                                            readWorkflowFile(file);
                                        }
                                    }),
                                    (jsonText.trim() ? (0, react_jsx_runtime.jsx)("p", { className: "MMR_hint", children: Array.isArray(detected) && detected.length > 0 ? t("detectOk") + detected.map(capLabel).join(t("detectJoin")) : t("detectNone") }) : null),
                                    (jsonText.trim() ? (0, react_jsx_runtime.jsxs)("div", {
                                        className: "MMR_footRow",
                                        children: [
                                            (0, react_jsx_runtime.jsx)("button", {
                                                type: "button",
                                                className: "MMR_saveBtn",
                                                disabled: busyKey === "import",
                                                onClick: () => void doImport(),
                                                children: t("importGo")
                                            }),
                                            (impMsg ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_hint", "data-ok": impMsg.ok ? "true" : "false", children: impMsg.text }) : null)
                                        ]
                                    }) : null)
                                ]
                            }),
                            (0, react_jsx_runtime.jsxs)("div", {
                                className: "MMR_card",
                                children: [
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        className: "MMR_cardHead",
                                        children: [
                                            (0, react_jsx_runtime.jsx)("span", { className: "MMR_name", children: "RunningHub" }),
                                            (0, react_jsx_runtime.jsx)("span", { className: "MMR_idTag", children: "runninghub" })
                                        ]
                                    }),
                                    (0, react_jsx_runtime.jsx)("div", { className: "MMR_subLabel", children: t("rhBlockWf") }),
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
                                        children: [
                                            (0, react_jsx_runtime.jsx)("input", {
                                                className: "MMR_input",
                                                type: "text",
                                                placeholder: t("rhWorkflowUrl"),
                                                style: { maxWidth: "320px" },
                                                value: rhUrl,
                                                onChange: (event) => setRhUrl(event.currentTarget.value)
                                            }),
                                            (0, react_jsx_runtime.jsx)("button", {
                                                type: "button",
                                                className: "MMR_saveBtn",
                                                disabled: busyKey === "autoRh",
                                                onClick: () => void doAutoRh(),
                                                children: t("readAndImport")
                                            })
                                        ]
                                    }),
                                    (0, react_jsx_runtime.jsx)("div", { className: "MMR_subLabel", style: { marginTop: "10px" }, children: t("rhBlockApp") }),
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
                                        children: [
                                            (0, react_jsx_runtime.jsx)("input", {
                                                className: "MMR_input",
                                                type: "text",
                                                placeholder: t("rhAppUrl"),
                                                style: { maxWidth: "280px" },
                                                value: rhAppUrl,
                                                onChange: (event) => setRhAppUrl(event.currentTarget.value)
                                            }),
                                            (0, react_jsx_runtime.jsxs)("select", {
                                                className: "MMR_select",
                                                style: { maxWidth: "140px" },
                                                title: t("rhAppOut"),
                                                value: rhAppCap,
                                                onChange: (event) => setRhAppCap(event.target.value),
                                                children: CAP_TYPES.map((r) => (0, react_jsx_runtime.jsx)("option", { value: r[0], children: capLabel(r[0]) }, r[0]))
                                            }),
                                            (0, react_jsx_runtime.jsx)("button", {
                                                type: "button",
                                                className: "MMR_saveBtn",
                                                disabled: busyKey === "addRhApp",
                                                onClick: () => void doAddRhApp(),
                                                children: t("addRhApp")
                                            })
                                        ]
                                    }),
                                    (0, react_jsx_runtime.jsx)("div", { className: "MMR_subLabel", style: { marginTop: "10px" }, children: t("rhBlockModel") }),
                                    (entProvMissing ? (0, react_jsx_runtime.jsx)("p", { className: "MMR_hint", "data-ok": "false", children: t("rhEntWarn") }) : null),
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
                                        children: [
                                            (0, react_jsx_runtime.jsxs)("select", {
                                                className: "MMR_select",
                                                style: { maxWidth: "110px" },
                                                value: rhCat,
                                                onChange: (event) => setRhCat(event.currentTarget.value),
                                                children: [
                                                    (0, react_jsx_runtime.jsx)("option", { value: "all", children: t("rhCatAll") }, "all"),
                                                    ...RH_OUTPUT_TYPES.map((o) => (0, react_jsx_runtime.jsx)("option", { value: o, children: t(o === "image" ? "outImage" : o === "video" ? "outVideo" : "outAudio") }, o))
                                                ]
                                            }),
                                            (0, react_jsx_runtime.jsx)("input", {
                                                className: "MMR_input",
                                                type: "text",
                                                placeholder: t("rhSearch"),
                                                style: { maxWidth: "240px" },
                                                value: rhSearch,
                                                onChange: (event) => setRhSearch(event.currentTarget.value)
                                            }),
                                            (0, react_jsx_runtime.jsx)("button", {
                                                type: "button",
                                                className: "MMR_refreshBtn",
                                                disabled: busyKey === "rhCatalog",
                                                title: t("rhRefresh"),
                                                onClick: () => void doRefreshCatalog(),
                                                children: "↻ " + t("rhRefresh")
                                            })
                                        ]
                                    }),
                                    (0, react_jsx_runtime.jsx)("div", {
                                        className: "MMR_famList",
                                        children: rhFamMatches.length === 0
                                            ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_hint", children: t("rhNoMatch") })
                                            : rhFamMatches.map((f) => (0, react_jsx_runtime.jsxs)("div", {
                                                className: "MMR_famCard",
                                                children: [
                                                    (0, react_jsx_runtime.jsxs)("div", {
                                                        className: "MMR_famHead",
                                                        children: [
                                                            (0, react_jsx_runtime.jsx)("span", { className: "MMR_famName", title: f.name, children: f.name }),
                                                            ...Array.from(new Set(f.eps.map((e) => e.cap))).map((c) => (0, react_jsx_runtime.jsx)("span", { className: "MMR_famTag", children: capLabel(c) }, c))
                                                        ]
                                                    }),
                                                    ...f.eps.map((e) => (0, react_jsx_runtime.jsxs)("div", {
                                                        className: "MMR_epRow",
                                                        children: [
                                                            (0, react_jsx_runtime.jsx)("span", { className: "MMR_epPath", title: "/" + e.endpoint, children: "/" + e.endpoint }),
                                                            (0, react_jsx_runtime.jsx)("span", { className: "MMR_epName", title: e.name, children: e.name }),
                                                            (0, react_jsx_runtime.jsx)("button", {
                                                                type: "button",
                                                                className: "MMR_epAdd",
                                                                disabled: busyKey === "addRhEndpoint",
                                                                title: t("addRhEndpoint"),
                                                                onClick: () => { void importRhEp(e.endpoint, e.cap, e.name); },
                                                                children: "+"
                                                            })
                                                        ]
                                                    }, e.endpoint))
                                                ]
                                            }, f.name))
                                    }),
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "6px" },
                                        children: [
                                            (0, react_jsx_runtime.jsx)("input", {
                                                className: "MMR_input",
                                                type: "text",
                                                placeholder: t("rhEndpoint"),
                                                style: { maxWidth: "220px" },
                                                value: rhEndpoint,
                                                onChange: (event) => setRhEndpoint(event.currentTarget.value)
                                            }),
                                            (0, react_jsx_runtime.jsx)("select", {
                                                className: "MMR_select",
                                                style: { maxWidth: "130px" },
                                                value: rhEndpointCap,
                                                onChange: (event) => setRhEndpointCap(event.currentTarget.value),
                                                children: CAP_TYPES.map((r) => (0, react_jsx_runtime.jsx)("option", { value: r[0], children: capLabel(r[0]) }, r[0]))
                                            }),
                                            (0, react_jsx_runtime.jsx)("button", {
                                                type: "button",
                                                className: "MMR_saveBtn",
                                                disabled: busyKey === "addRhEndpoint",
                                                onClick: () => void doAddRhEndpoint(),
                                                children: t("addRhEndpoint")
                                            })
                                        ]
                                    })
                                ]
                            }),
                            (autoMsg ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_hint", "data-ok": autoMsg.ok ? "true" : "false", children: autoMsg.text }) : null)
                        ]
                    }),
                    ...(pending ? [(0, react_jsx_runtime.jsx)("p", { className: "MMR_hint", children: t("loading") })] : [capabilities.length === 0 ? (0, react_jsx_runtime.jsx)("p", { className: "MMR_status", children: t("noRecipes") }) : null]),
                    ...capabilities.map((group) => (0, react_jsx_runtime.jsxs)("div", {
                        className: "MMR_group",
                        children: [
                            (0, react_jsx_runtime.jsxs)("div", {
                                className: "MMR_groupTitle",
                                children: [
                                    (0, react_jsx_runtime.jsx)("h4", { children: capLabel(group.type) }),
                                    (0, react_jsx_runtime.jsx)("span", { children: group.type })
                                ]
                            }),
                            (0, react_jsx_runtime.jsx)("div", {
                                className: "MMR_cards",
                                children: group.recipes.map((row) => (0, react_jsx_runtime.jsx)(RecipeCard, {
                                    t,
                                    group,
                                    row,
                                    busyKey,
                                    opState: ops[row.id],
                                    applyEnabled,
                                    applyDefault,
                                    applyRename,
                                    applyCapability,
                                    applyDelete,
                                    applyDefaults,
                                    inspectWorkflowNodes
                                }))
                            })
                        ]
                    }, group.type)),
                    (0, react_jsx_runtime.jsxs)("div", {
                        className: "MMR_group",
                        children: [
                            (0, react_jsx_runtime.jsx)("div", { className: "MMR_groupTitle", children: (0, react_jsx_runtime.jsx)("h4", { children: t("providersLabel") }) }),
                            ...(() => {
                                // 消费级 cn/global 合并为单卡片（region 下拉切换），过滤掉独立的 runninghub-global 行
                                const view = Array.isArray(provs) ? [...provs].filter((p) => p && p.id !== "runninghub-global") : [];
                                if (!view.some((p) => p && p.id === "runninghub-enterprise")) {
                                    const row = { id: "runninghub-enterprise", configured: false, stale: false };
                                    const i = view.findIndex((p) => p && (p.id === "runninghub-cn" || p.id === "runninghub"));
                                    i >= 0 ? view.splice(i + 1, 0, row) : view.push(row);
                                }
                                return view;
                            })().map((p) => {
                                if (!p) return null;
                                const isRh = p.id === "runninghub" || p.id === "runninghub-cn";
                                const isRhE = p.id === "runninghub-enterprise";
                                const isOr = p.id === "openrouter";
                                // region 感知：消费级/企业级各自独立选国内版(cn)/国际版(global)
                                const scope = isRhE ? "enterprise" : isRh ? "consumer" : null;
                                const region = isRhE ? rhRegion.enterprise : isRh ? rhRegion.consumer : "cn";
                                const draftKey = isRhE ? ("rh-ent-" + region) : isRh ? ("rh-" + region) : p.id;
                                const cnProv = Array.isArray(provs) ? provs.find((x) => x && x.id === "runninghub-cn") : null;
                                const glProv = Array.isArray(provs) ? provs.find((x) => x && x.id === "runninghub-global") : null;
                                const configured = isRh ? (region === "global" ? Boolean(glProv && glProv.configured) : Boolean(cnProv && cnProv.configured)) : p.configured;
                                const nameOf = isRh ? (region === "global" ? (t("prov_runninghub-global") || "RunningHub 国际版 (runninghub.ai)") : (t("prov_runninghub-cn") || "RunningHub 国内版 (runninghub.cn)")) : isRhE ? t("provRhE") : isOr ? t("provOr") : p.id === "comfy-local" ? t("provComfy") : p.id;
                                const descOf = isRh ? (region === "global" ? (t("provDesc_runninghub-global") || "国际端点与 AI 应用/工作流执行（消费级 Key）") : (t("provDesc_runninghub-cn") || "国内端点与 AI 应用/工作流执行（消费级 Key）")) : isRhE ? t("provRhEDesc") : isOr ? t("provOrDesc") : p.id === "comfy-local" ? t("provComfyDesc") : null;
                                const v = rhVerified[draftKey];
                                return (0, react_jsx_runtime.jsxs)("div", {
                                    className: "MMR_provCard",
                                    children: [
                                        (0, react_jsx_runtime.jsxs)("div", {
                                            className: "MMR_provTop",
                                            children: [
                                                (0, react_jsx_runtime.jsx)("span", { className: "MMR_dot", "data-on": configured ? "true" : void 0 }),
                                                (0, react_jsx_runtime.jsx)("span", { className: "MMR_name", children: nameOf }),
                                                (0, react_jsx_runtime.jsx)("span", { className: "MMR_idTag", children: configured ? t("configured") : t("notConfigured") }),
                                                (p.stale ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_hint", "data-ok": "false", children: t("provStaleHint") }) : null),
                                                (((isRh || isRhE) && v && v.valid) ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_hint", "data-ok": (isRhE ? v.apiTypeLabel === "企业级-共享" : v.apiTypeLabel !== "企业级-共享") ? "true" : "false", children: v.apiTypeLabel + " · " + t("balance") + " " + (v.balance ?? "?") + " " + (v.currency ?? "") }) : null)
                                            ]
                                        }),
                                        (descOf ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_provDesc", children: descOf }) : null),
                                        ((isRh || isRhE || isOr) ? (0, react_jsx_runtime.jsxs)("div", {
                                            style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
                                            children: [
                                                ((isRh || isRhE) ? (0, react_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: "4px" }, children: [
                                                    (0, react_jsx_runtime.jsx)("span", { className: "MMR_chipLabel", children: (isRhE ? "企业级" : "消费级") + " 区域" }),
                                                    (0, react_jsx_runtime.jsx)("select", {
                                                        className: "MMR_chipSel",
                                                        style: { width: "150px" },
                                                        value: region,
                                                        onChange: (event) => {
                                                            const r = event.currentTarget.value;
                                                            setRhRegion((prev) => ({ ...prev, [isRhE ? "enterprise" : "consumer"]: r }));
                                                        },
                                                        children: [
                                                            (0, react_jsx_runtime.jsx)("option", { value: "cn", children: "国内版 runninghub.cn" }, "cn"),
                                                            (0, react_jsx_runtime.jsx)("option", { value: "global", children: "国际版 runninghub.ai" }, "global")
                                                        ]
                                                    })
                                                ] }) : null),
                                                (0, react_jsx_runtime.jsx)("input", {
                                                    className: "MMR_input",
                                                    type: "password",
                                                    placeholder: "API Key",
                                                    style: { maxWidth: "260px" },
                                                    value: keyDrafts[draftKey] ?? "",
                                                    onChange: (event) => {
                                                        const val = event.target.value;
                                                        setKeyDrafts((prev) => ({ ...prev, [draftKey]: val }));
                                                    }
                                                }),
                                                (0, react_jsx_runtime.jsx)("button", {
                                                    type: "button",
                                                    className: "MMR_saveBtn",
                                                    disabled: busyKey === "prov:" + draftKey || !(keyDrafts[draftKey] ?? "").trim(),
                                                    onClick: () => void applyKey(draftKey, (keyDrafts[draftKey] ?? "").trim(), scope, region),
                                                    children: t("saveKey")
                                                }),
                                                ((isRh || isRhE) ? (0, react_jsx_runtime.jsx)("button", {
                                                    type: "button",
                                                    className: "MMR_refreshBtn",
                                                    disabled: busyKey === "verifyRh:" + draftKey || (!(keyDrafts[draftKey] ?? "").trim() && !configured),
                                                    onClick: () => void doVerifyRhKey(draftKey, scope, region),
                                                    children: t("verifyKey")
                                                }) : null),
                                                (0, react_jsx_runtime.jsx)("button", {
                                                    type: "button",
                                                    className: "MMR_refreshBtn",
                                                    disabled: busyKey === "prov:" + draftKey || !configured,
                                                    onClick: () => void applyKey(draftKey, null, scope, region),
                                                    children: t("clearKey")
                                                })
                                            ]
                                        }) : null),
                                        (isOr ? (0, react_jsx_runtime.jsxs)("div", {
                                            style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
                                            children: [
                                                (0, react_jsx_runtime.jsx)("input", {
                                                    className: "MMR_input",
                                                    type: "text",
                                                    placeholder: t("modelPlaceholder"),
                                                    style: { maxWidth: "300px" },
                                                    value: orModel,
                                                    onChange: (event) => setOrModel(event.currentTarget.value)
                                                }),
                                                (0, react_jsx_runtime.jsx)("button", {
                                                    type: "button",
                                                    className: "MMR_refreshBtn",
                                                    disabled: busyKey === "resolveOr" || !orModel.trim(),
                                                    onClick: () => void doResolveOr(),
                                                    children: t("orResolve")
                                                }),
                                                (orResolved ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_hint", "data-ok": "true", children: (orResolved.name ?? orResolved.model) + " · " + capLabel(orCap) + " · " + (orResolved.modalities ?? []).join("/") }) : null),
                                                (0, react_jsx_runtime.jsx)("button", {
                                                    type: "button",
                                                    className: "MMR_saveBtn",
                                                    disabled: busyKey === "addModel" || !orModel.trim(),
                                                    onClick: () => void doAddModel(),
                                                    children: t("addModel")
                                                })
                                            ]
                                        }) : null)
                                    ]
                                }, p.id);
                            })
                        ]
                    })
                ]
            });
        }
        // ── 对话内媒体任务进度卡片（ui-tool 的 keyed tool.call.toolview）─────────
        const TERMINAL_TASK_STATES = ["COMPLETED", "FAILED", "CANCELLED", "PARTIAL"];
        function parseTaskProps(props) {
            const block = props.block || {};
            const head = block.kind === "tool-result" ? (block.call || null) : { argsRaw: block.argsRaw };
            let input = null;
            if (head && typeof head.argsRaw === "string") {
                try { input = JSON.parse(head.argsRaw); } catch { input = null; }
            }
            let result = null;
            if (block.kind === "tool-result" && Array.isArray(block.content)) {
                const text = block.content.filter((b) => b && b.type === "text").map((b) => b.text || "").join("\
");
                try { result = JSON.parse(text); } catch { result = null; }
            }
            const taskId = (result && (result.taskId || result.task_id)) || (input && (input.taskId || input.task_id)) || null;
            return { input, result, taskId };
        }
        const badgeKindOf = (s) => {
            const v = String(s || "").toUpperCase();
            if (v === "COMPLETED" || v === "DONE" || v === "SUCCEEDED") return "done";
            if (v === "FAILED" || v === "PARTIAL") return "failed";
            if (v === "RUNNING" || v === "READY" || v === "PLANNING") return "running";
            return "idle";
        };
        function AudioPlayerView(props) {
            const { src, path, openFile, t } = props;
            const audioRef = react.useRef(null);
            const [playing, setPlaying] = react.useState(false);
            const [currentTime, setCurrentTime] = react.useState(0);
            const [duration, setDuration] = react.useState(0);

            const togglePlay = () => {
                const a = audioRef.current;
                if (!a) return;
                if (playing) {
                    a.pause();
                    setPlaying(false);
                } else {
                    a.play().then(() => setPlaying(true)).catch(() => {});
                }
            };

            const fmtTime = (s) => {
                if (!s || isNaN(s)) return "00:00";
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return (m < 10 ? "0" + m : m) + ":" + (sec < 10 ? "0" + sec : sec);
            };

            return (0, react_jsx_runtime.jsxs)("div", {
                className: "MMR_audioPlayer",
                style: { maxWidth: "460px", marginTop: "4px" },
                children: [
                    (0, react_jsx_runtime.jsx)("audio", {
                        ref: audioRef,
                        src: src,
                        preload: "metadata",
                        onTimeUpdate: (e) => setCurrentTime(e.currentTarget.currentTime),
                        onLoadedMetadata: (e) => setDuration(e.currentTarget.duration),
                        onEnded: () => setPlaying(false),
                        onPlay: () => setPlaying(true),
                        onPause: () => setPlaying(false),
                        style: { display: "none" }
                    }),
                    (0, react_jsx_runtime.jsxs)("div", {
                        className: "MMR_playerMain",
                        children: [
                            (0, react_jsx_runtime.jsx)("button", {
                                type: "button",
                                className: "MMR_playBtn" + (playing ? " MMR_playBtnActive" : ""),
                                onClick: togglePlay,
                                children: playing ? "⏸" : "▶"
                            }),
                            (0, react_jsx_runtime.jsxs)("div", {
                                className: "MMR_playerTrackWrap",
                                children: [
                                    (0, react_jsx_runtime.jsx)("input", {
                                        type: "range",
                                        className: "MMR_seekRange",
                                        min: 0,
                                        max: duration || 100,
                                        step: 0.1,
                                        value: currentTime,
                                        onChange: (e) => {
                                            const val = Number(e.target.value);
                                            setCurrentTime(val);
                                            if (audioRef.current) audioRef.current.currentTime = val;
                                        }
                                    }),
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        style: { display: "flex", justifyContent: "space-between", alignItems: "center" },
                                        children: [
                                            (0, react_jsx_runtime.jsxs)("div", {
                                                className: "MMR_timeDisplay",
                                                children: [
                                                    (0, react_jsx_runtime.jsx)("span", { className: "MMR_curTime", children: fmtTime(currentTime) }),
                                                    (0, react_jsx_runtime.jsx)("span", { className: "MMR_sepTime", children: "/" }),
                                                    (0, react_jsx_runtime.jsx)("span", { className: "MMR_durTime", children: fmtTime(duration) })
                                                ]
                                            }),
                                            (0, react_jsx_runtime.jsxs)("div", {
                                                style: { display: "flex", gap: "6px" },
                                                children: [
                                                    (0, react_jsx_runtime.jsxs)("a", {
                                                        className: "MMR_refreshBtn",
                                                        href: src,
                                                        download: (path ? path.split(/[\\/]/).pop() : "audio.mp3") || "audio.mp3",
                                                        style: { textDecoration: "none", fontSize: "11px", padding: "2px 8px" },
                                                        children: ["⬇ ", t("download") || "下载"]
                                                    }),
                                                    (path && typeof openFile === "function" ? (0, react_jsx_runtime.jsx)("button", {
                                                        type: "button",
                                                        className: "MMR_refreshBtn",
                                                        style: { fontSize: "11px", padding: "2px 8px" },
                                                        onClick: () => openFile(path),
                                                        children: t("openFile")
                                                    }) : null)
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            });
        }
        function MediaTaskCard(props) {
            const { t, snapshot, openFile, revealAsset } = props;
            const info = react.useMemo(() => parseTaskProps(props), [props.block]);
            const taskId = info.taskId;
            const [snap, setSnap] = react.useState(null);
            const [err, setErr] = react.useState(null);
            react.useEffect(() => {
                if (!taskId || typeof snapshot !== "function")
                    return;
                let alive = true;
                let timer = null;
                let fails = 0;
                const tick = async () => {
                    let stop = false;
                    try {
                        const s = await snapshot(taskId);
                        if (!alive)
                            return;
                        setSnap(s);
                        setErr(null);
                        fails = 0;
                        if (TERMINAL_TASK_STATES.indexOf(String(s && s.state).toUpperCase()) >= 0)
                            stop = true;
                    }
                    catch (e) {
                        if (!alive)
                            return;
                        fails++;
                        if (fails >= 4) {
                            setErr(String(e && e.message ? e.message : e));
                            stop = true;
                        }
                    }
                    if (!stop && alive)
                        timer = setTimeout(tick, 1200);
                };
                tick();
                return () => {
                    alive = false;
                    if (timer)
                        clearTimeout(timer);
                };
            }, [taskId, snapshot]);
            if (!taskId && !info.input)
                return null;
            const stateVal = snap ? snap.state : (info.result && info.result.state) || (taskId ? "RUNNING" : null);
            const percent = snap && typeof snap.percent === "number" ? snap.percent : null;
            const goal = (snap && snap.goal) || (info.input && info.input.goal) || taskId || props.toolName;
            const steps = (snap && Array.isArray(snap.steps) ? snap.steps : (info.input && Array.isArray(info.input.steps) ? info.input.steps.map((s) => ({ id: s.id, capability: s.capability, state: s.state || "READY", recipeId: null, error: null })) : []));
            const outputs = (snap && Array.isArray(snap.outputs) ? snap.outputs : []);
            // 输入素材（拖入/参考媒体）：与产出同形态内联展示；点击媒体即预览，附打开/定位按钮
            const inputAssets = (snap && Array.isArray(snap.inputs) ? snap.inputs : []);
            const inputRows = inputAssets.length === 0 ? null : (0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: [
                    (0, react_jsx_runtime.jsx)("span", { className: "MMR_badge", children: t("inputsLabel") || "输入" }),
                    ...inputAssets.map((o) => {
                        const actionRow = (0, react_jsx_runtime.jsxs)("div", {
                            style: { display: "flex", alignItems: "center", gap: "8px" },
                            children: [
                                (o.dataUrl ? (0, react_jsx_runtime.jsxs)("a", {
                                    className: "MMR_refreshBtn",
                                    href: o.dataUrl,
                                    download: o.name || "material",
                                    style: { textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" },
                                    children: ["⬇ ", t("download") || "下载"]
                                }) : null),
                                (o.path && typeof openFile === "function" ? (0, react_jsx_runtime.jsx)("button", {
                                    type: "button",
                                    className: "MMR_refreshBtn",
                                    onClick: () => openFile(o.path),
                                    children: t("openFile")
                                }) : null),
                                (o.path && typeof revealAsset === "function" ? (0, react_jsx_runtime.jsx)("button", {
                                    type: "button",
                                    className: "MMR_refreshBtn",
                                    onClick: () => void revealAsset({ assetId: o.assetId }),
                                    children: "定位"
                                }) : null)
                            ]
                        });
                        if (o.kind === "video" && o.dataUrl) {
                            return (0, react_jsx_runtime.jsxs)("div", {
                                style: { display: "flex", flexDirection: "column", gap: "6px", width: "100%", maxWidth: "480px" },
                                children: [
                                    (0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                                            (0, react_jsx_runtime.jsx)("span", { className: "MMR_badge", children: o.kind }),
                                            (0, react_jsx_runtime.jsx)("span", { style: { fontSize: "12px", opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: o.name })
                                        ] }),
                                    (0, react_jsx_runtime.jsx)("video", { controls: true, src: o.dataUrl, style: { width: "100%", maxWidth: "480px", borderRadius: "6px" } }),
                                    actionRow
                                ]
                            }, o.assetId);
                        }
                        if (o.kind === "image" && o.dataUrl) {
                            return (0, react_jsx_runtime.jsxs)("div", {
                                style: { display: "flex", flexDirection: "column", gap: "6px", width: "100%", maxWidth: "480px" },
                                children: [
                                    (0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                                            (0, react_jsx_runtime.jsx)("span", { className: "MMR_badge", children: o.kind }),
                                            (0, react_jsx_runtime.jsx)("span", { style: { fontSize: "12px", opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: o.name })
                                        ] }),
                                    (0, react_jsx_runtime.jsx)("img", { src: o.dataUrl, alt: o.name, style: { width: "100%", maxHeight: "280px", objectFit: "contain", borderRadius: "8px", background: "rgba(0,0,0,0.3)" } }),
                                    actionRow
                                ]
                            }, o.assetId);
                        }
                        if (o.kind === "audio" && o.dataUrl) {
                            return (0, react_jsx_runtime.jsx)(AudioPlayerView, { src: o.dataUrl, path: o.path, openFile: openFile, t: t }, o.assetId);
                        }
                        return (0, react_jsx_runtime.jsxs)("div", { className: "MMR_outRow", children: [
                                (0, react_jsx_runtime.jsx)("span", { className: "MMR_badge", children: o.kind }),
                                (0, react_jsx_runtime.jsx)("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: o.name || o.path })
                            ] }, o.assetId);
                    })
                ] });
            const headRow = (0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }, children: [
                    (0, react_jsx_runtime.jsx)("strong", { style: { fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: goal }),
                    stateVal ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_badge", "data-state": badgeKindOf(stateVal), children: stateVal }) : null
                ] });
            const progRow = percent === null ? null : (0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                    (0, react_jsx_runtime.jsx)("div", { className: "MMR_prog", children: (0, react_jsx_runtime.jsx)("div", { className: "MMR_progBar", style: { width: percent + "%" } }) }),
                    (0, react_jsx_runtime.jsx)("span", { children: percent + "%" })
                ] });
            const stepRows = steps.length === 0 ? null : (0, react_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: "4px" }, children: steps.map((s) => (0, react_jsx_runtime.jsxs)("div", { className: "MMR_stepRow", children: [
                        (0, react_jsx_runtime.jsx)("span", { className: "MMR_badge", "data-state": badgeKindOf(s.state), children: s.state }),
                        (0, react_jsx_runtime.jsx)("span", { children: s.id + " · " + s.capability }),
                        (s.error ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_failure", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: s.error }) : null)
                    ] }, s.id)) });
            const outputRows = outputs.length === 0 ? null : (0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: [
                    (0, react_jsx_runtime.jsx)("span", { className: "MMR_badge", children: t("outputsLabel") }),
                    ...outputs.map((o) => {
                        if (o.kind === "image" && o.dataUrl) {
                            return (0, react_jsx_runtime.jsxs)("div", {
                                style: { display: "flex", flexDirection: "column", gap: "6px", width: "100%", maxWidth: "480px" },
                                children: [
                                    (0, react_jsx_runtime.jsx)("img", {
                                        className: "MMR_outImg",
                                        src: o.dataUrl,
                                        alt: o.assetId,
                                        style: { width: "100%", maxHeight: "320px", objectFit: "contain", borderRadius: "8px", background: "rgba(0,0,0,0.3)" }
                                    }),
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        style: { display: "flex", alignItems: "center", gap: "8px" },
                                        children: [
                                            (0, react_jsx_runtime.jsxs)("a", {
                                                className: "MMR_refreshBtn",
                                                href: o.dataUrl,
                                                download: (o.path ? o.path.split(/[\\/]/).pop() : "image.png") || "image.png",
                                                style: { textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" },
                                                children: ["⬇ ", t("download") || "下载"]
                                            }),
                                            (o.path && typeof openFile === "function" ? (0, react_jsx_runtime.jsx)("button", {
                                                type: "button",
                                                className: "MMR_refreshBtn",
                                                onClick: () => openFile(o.path),
                                                children: t("openFile")
                                            }) : null)
                                        ]
                                    })
                                ]
                            }, o.assetId);
                        }
                        if (o.kind === "audio" && o.dataUrl) {
                            return (0, react_jsx_runtime.jsx)(AudioPlayerView, { src: o.dataUrl, path: o.path, openFile: openFile, t: t }, o.assetId);
                        }
                        if (o.kind === "video" && o.dataUrl) {
                            return (0, react_jsx_runtime.jsxs)("div", {
                                className: "MMR_outRow",
                                style: { flexDirection: "column", alignItems: "flex-start", width: "100%", maxWidth: "480px" },
                                children: [
                                    (0, react_jsx_runtime.jsx)("span", { className: "MMR_badge", children: o.kind }),
                                    (0, react_jsx_runtime.jsx)("video", { controls: true, src: o.dataUrl, style: { width: "100%", maxWidth: "480px", borderRadius: "6px", marginTop: "4px" } }),
                                    (0, react_jsx_runtime.jsxs)("div", {
                                        style: { display: "flex", gap: "8px", marginTop: "4px" },
                                        children: [
                                            (0, react_jsx_runtime.jsxs)("a", {
                                                className: "MMR_refreshBtn",
                                                href: o.dataUrl,
                                                download: (o.path ? o.path.split(/[\\/]/).pop() : "video.mp4") || "video.mp4",
                                                style: { textDecoration: "none" },
                                                children: ["⬇ ", t("download") || "下载"]
                                            }),
                                            (o.path && typeof openFile === "function" ? (0, react_jsx_runtime.jsx)("button", {
                                                type: "button",
                                                className: "MMR_refreshBtn",
                                                onClick: () => openFile(o.path),
                                                children: t("openFile")
                                            }) : null)
                                        ]
                                    })
                                ]
                            }, o.assetId);
                        }
                        return (0, react_jsx_runtime.jsxs)("div", { className: "MMR_outRow", children: [
                                (0, react_jsx_runtime.jsx)("span", { className: "MMR_badge", children: o.kind }),
                                (0, react_jsx_runtime.jsx)("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "320px" }, children: o.path }),
                                (typeof openFile === "function"
                                    ? (0, react_jsx_runtime.jsx)("button", { type: "button", className: "MMR_refreshBtn", onClick: () => openFile(o.path), children: t("openFile") })
                                    : null)
                            ] }, o.assetId);
                    })
                ] });
            if (!taskId)
                return (0, react_jsx_runtime.jsx)("pre", { style: { fontSize: "11px", whiteSpace: "pre-wrap", margin: 0 }, children: JSON.stringify(info.result ?? info.input ?? {}).slice(0, 600) });
            return (0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0, padding: "2px 0" }, children: [
                    headRow,
                    progRow,
                    (err ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_failure", children: t("cardFailed") + " · " + err }) : null),
                    stepRows,
                    inputRows,
                    outputRows
                ] });
        }
        // ── 对话框多模态生成（input.left 菜单按钮 + input.dock 参数芯片条）─────
        // 交互模型（对齐豆包/ChatGPT 输入框）：菜单选模式 → 输入区上方出现芯片条（模式chip + 工作流下拉 + 比例），
        // 草稿始终保持用户纯文本；发送瞬间客户端直接调 quickCreateTask 创建任务（不经 LLM 推理，秒级开始生成），
        // 输入框上方生成窗口轮询 taskSnapshot 展示进度条与产出；草稿仅注入一行极简告知防 LLM 重复生成。
        const MMR_MODES = [
            { id: "image", labelKey: "genImage", caps: ["text-to-image", "image-to-image", "image-upscale", "remove-background", "image-to-3d"], defaultCap: "text-to-image", sized: true },
            { id: "video", labelKey: "genVideo", caps: ["image-to-video", "text-to-video", "first-last-frame-video", "multi-image-to-video", "image-and-video-to-video", "video-upscale"], defaultCap: "image-to-video", sized: true },
            { id: "audio", labelKey: "genAudio", caps: ["text-to-audio", "video-to-audio", "text-to-music"], defaultCap: "text-to-audio", sized: false }
        ];
        const MMR_RATIOS_IMAGE = [["1:1", 1024, 1024], ["16:9", 1280, 720], ["9:16", 720, 1280], ["4:3", 1024, 768], ["3:4", 768, 1024]];
        const MMR_RATIOS_VIDEO = [["16:9", 1280, 720], ["9:16", 720, 1280], ["1:1", 720, 720], ["4:3", 960, 720], ["3:4", 720, 960]];
        const mmrRatiosOf = (mode) => (mode === "video" ? MMR_RATIOS_VIDEO : MMR_RATIOS_IMAGE);
        const MMR_CHIP_GROUPS = [["comfy-local", "grpComfy"], ["runninghub", "grpRh"], ["openrouter", "grpOr"]];
        // 芯片状态：插件生命周期内的模块级 store（菜单按钮与芯片条分属两个槽位，需要共享）
        const mmrChipStore = {
            state: { mode: null, recipeId: "", recipeCap: "", ratio: "16:9", duration: 5, params: {} },
            listeners: new Set(),
            set(next) {
                this.state = { ...this.state, ...next };
                this.listeners.forEach((l) => l());
            }
        };
        const mmrSubscribe = (cb) => {
            mmrChipStore.listeners.add(cb);
            return () => { mmrChipStore.listeners.delete(cb); };
        };
        const mmrSnapshot = () => mmrChipStore.state;
        // submit 包装（WeakSet 防重）与最新 rows/draft 快照均放模块级：即使芯片条组件重挂载，包装闭包仍读到最新状态
        const mmrWrappedSubmits = new WeakSet();
        const mmrLive = { rows: [], draft: "", quickCreate: null, pluginVideos: [], setPluginVideos: null, pluginImages: [], setPluginImages: null, sessionId: null };
        // 发送瞬间被认领的 file-intake 队列素材（{name,rel}）：认领钩子写入、submit 包装消费。
        // 认领≠占用：包装层除「直调成功」外的所有路径都把 rel 以 @路径 形态还回草稿，绝不吞附件。
        // 带时间戳：包装层只消费 2 秒内的认领（防异常路径残留的陈旧认领串味下一次发送）。
        const mmrClaimed = { pending: [], at: 0 };
        // apply() 注入的插件根 ctx：mmrLiveDraft 经宿主 input registry 读实时草稿用
        let mmrRootCtx = null;
        // 实时草稿：宿主 input registry（conversation.input.for(sessionActx).state，宿主明示
        // "other plugins may reach"）是同步落盘的唯一事实源——渲染期快照 mmrLive.draft 在同
        // tick 内（file-intake 刚 setDraft 完）必然陈旧。任何读取失败返回 null，调用方据此
        // 决定「放弃补写」而不是「拿旧值覆盖」。
        const mmrLiveDraft = () => {
            try {
                const ctx = mmrRootCtx;
                if (!ctx) return null;
                const sessions = ctx.get("sessions");
                const sid = sessions.currentProvideInfo.getSnapshot().sessionId;
                const actx = sid === undefined || sid === null ? undefined : sessions.scope(sid);
                if (!actx) return null;
                const conv = ctx.get("conversation");
                const shell = conv && conv.input ? conv.input.for(actx) : null;
                const draft = shell && shell.state ? shell.state.getSnapshot().draft : undefined;
                return typeof draft === "string" ? draft : null;
            } catch (e) {
                return null;
            }
        };
        // 当前会话 id（远程调用带上，服务端据此按会话工作区解析 .dsh/uploads 相对路径——
        // 宿主进程 cwd 不一定等于会话工作区，实测曾导致素材解析失败）
        const mmrCurrentSessionId = () => {
            try {
                const sessions = mmrRootCtx ? mmrRootCtx.get("sessions") : null;
                return sessions ? sessions.currentProvideInfo.getSnapshot().sessionId : undefined;
            } catch (e) {
                return undefined;
            }
        };
        // file-intake 队列条目的媒体类型（按扩展名；队列条目只有 name/rel，无 MIME）
        const mmrMediaKindOf = (entry) => {
            const name = String((entry && (entry.name || entry.rel)) || "");
            if (/\.(mp4|mov|avi|mkv|webm|flv|m4v)$/i.test(name)) return "video";
            if (/\.(png|jpe?g|webp|gif|bmp|avif|svgz?)$/i.test(name)) return "image";
            return null;
        };
        // 用户纯正文：剥零宽占位符 + 剥 file-intake 注入的 @.dsh/uploads/ 引用行（只匹配该
        // 前缀的整行，防误伤正文里恰好提到路径的情况）
        const mmrPromptOf = (text) => String(text || "")
            .replace(/\u200B/g, "")
            .split("\n")
            .filter((line) => !/^@\.dsh\/uploads\/\S+$/.test(line.trim()))
            .join("\n")
            .trim();
        // 芯片当前生效 recipe/能力（包装层与认领钩子共用同一解析，避免两处判定分叉）
        const mmrCapOfChip = (chipNow) => {
            const rows = Array.isArray(mmrLive.rows) ? mmrLive.rows : [];
            const row = rows.find((r) => r.id === chipNow.recipeId && r.capability === chipNow.recipeCap)
                || (rows.find((r) => r.id === chipNow.recipeId) ?? null);
            const def = MMR_MODES.find((m) => m.id === chipNow.mode);
            return { row, cap: row ? row.capability : (def ? def.defaultCap : "text-to-image") };
        };
        // file-intake 发送瞬间的素材交接知会（同步，FI 在最外层包装里调用）：芯片激活且正文
        // 非空时，把队列里的视频/图片素材标记给本插件——直调任务将以路径交接使用它们。
        // 返回被标记条目的 id 数组。**FI 不再因认领而改变 @路径 注入**（消息与对话里素材
        // 保持可见）。正文为空（不会走直调路径）或素材-能力不匹配时一律不标记——素材照常
        // 随 @路径 送达智能体，绝不静默丢弃。
        const mmrClaimAttachments = (items) => {
            const chipNow = mmrChipStore.state;
            if (!chipNow || !chipNow.mode) return [];
            const list = Array.isArray(items) ? items : [];
            if (list.length === 0) return [];
            const live = mmrLiveDraft();
            if (live === null || mmrPromptOf(live) === "") return [];
            const { cap } = mmrCapOfChip(chipNow);
            const wantVideos = chipNow.mode === "video";
            const wantImages = chipNow.mode === "image" || cap === "image-and-video-to-video";
            if (!wantVideos && !wantImages) return [];
            const claimed = list.filter((entry) => {
                const kind = mmrMediaKindOf(entry);
                return kind === "video" ? wantVideos : kind === "image" ? wantImages : false;
            });
            if (claimed.length === 0) return [];
            const videoCount = (Array.isArray(mmrLive.pluginVideos) ? mmrLive.pluginVideos.length : 0)
                + claimed.filter((e) => mmrMediaKindOf(e) === "video").length;
            const imageCount = (Array.isArray(mmrLive.pluginImages) ? mmrLive.pluginImages.length : 0)
                + claimed.filter((e) => mmrMediaKindOf(e) === "image").length;
            if (mmrCheckAssets(cap, imageCount, videoCount)) return [];
            mmrClaimed.pending = claimed.map((e) => ({ name: e.name, rel: e.rel }));
            mmrClaimed.at = Date.now();
            return claimed.map((e) => e.id);
        };
        if (typeof window !== "undefined")
            window.__mmrClaimAttachments = mmrClaimAttachments;
        // 文件读取辅助：dataUrl（内联预览用）与裸 base64（落盘上传用，大文件不过 FileReader）
        const mmrReadDataUrl = (file) => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
        });
        const mmrFileToBase64 = (file) => file.arrayBuffer().then((buffer) => {
            const bytes = new Uint8Array(buffer);
            let binary = "";
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize)
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            return btoa(binary);
        });
        // 超过该大小的素材不做内联 dataUrl（内存考虑），仅落盘走 rel；点击预览时服务端按需出图
        const MMR_PREVIEW_INLINE_BYTES = 30 * 1024 * 1024;
        // 图片文件摄入（拖入混合批次时插件接管；图片 chip 显示，提交优先 rel 路径交接、单张 ≤12MB）
        const mmrIngestImages = (fileList) => {
            const list = Array.from(fileList || []);
            const cur = Array.isArray(mmrLive.pluginImages) ? mmrLive.pluginImages : [];
            const jobs = [];
            for (const f of list.slice(0, 4 - cur.length)) {
                if (!/^image\//.test(f.type || "") && !/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.name || "")) continue;
                if (f.size > 12 * 1024 * 1024) continue;
                jobs.push(f);
            }
            if (jobs.length === 0) return Promise.resolve(0);
            return Promise.all(jobs.map(async (f) => {
                const data = await mmrReadDataUrl(f);
                let rel = "";
                try {
                    if (typeof mmrLive.ingestMedia === "function" && data) {
                        const r = await mmrLive.ingestMedia({ name: f.name || "image.png", base64: data.split(",")[1] || "", kind: "image" });
                        rel = String((r && r.rel) || "");
                    }
                }
                catch (e) {
                    console.warn("[MMR] 图片落盘失败，发送时退回 base64 交接", e);
                }
                if (!data && !rel)
                    return null;
                return { mediaType: f.type || "image/png", data, name: f.name || "image.png", rel };
            })).then((loaded) => {
                const added = loaded.filter(Boolean);
                if (added.length > 0) {
                    const next = [...(Array.isArray(mmrLive.pluginImages) ? mmrLive.pluginImages : []), ...added].slice(0, 4);
                    if (typeof mmrLive.setPluginImages === "function") mmrLive.setPluginImages(next);
                    else mmrLive.pluginImages = next;
                }
                return added.length;
            });
        };
        // 视频文件摄入（📎参考视频按钮 + 拖入共用）：过滤视频类型/大小 → 落盘换 rel（发送走路径交接，
        // 200MB 级视频不再整段 base64 过 JSON 通道）→ ≤30MB 顺带读 dataUrl 供芯片点击内联预览。
        // 返回 Promise<number> = 成功加入的视频数。
        const mmrIngestVideos = (fileList) => {
            const list = Array.from(fileList || []);
            const cur = Array.isArray(mmrLive.pluginVideos) ? mmrLive.pluginVideos : [];
            const jobs = [];
            for (const f of list.slice(0, 2 - cur.length)) {
                if (!/^video\//.test(f.type || "") && !/\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(f.name || "")) continue;
                if (f.size > 200 * 1024 * 1024) continue;
                jobs.push(f);
            }
            if (jobs.length === 0) return Promise.resolve(0);
            return Promise.all(jobs.map(async (f) => {
                const inline = f.size <= MMR_PREVIEW_INLINE_BYTES;
                let data = "";
                if (inline)
                    data = await mmrReadDataUrl(f);
                let rel = "";
                try {
                    if (typeof mmrLive.ingestMedia === "function") {
                        const b64 = data ? data.split(",")[1] || "" : await mmrFileToBase64(f);
                        if (b64) {
                            const r = await mmrLive.ingestMedia({ name: f.name || "video.mp4", base64: b64, kind: "video" });
                            rel = String((r && r.rel) || "");
                        }
                    }
                }
                catch (e) {
                    console.warn("[MMR] 视频落盘失败，发送时退回 base64 交接", e);
                }
                if (!data && !rel)
                    return null;
                return { mediaType: f.type || "video/mp4", data, name: f.name || "video.mp4", rel };
            })).then((loaded) => {
                const added = loaded.filter(Boolean);
                if (added.length > 0) {
                    const next = [...(Array.isArray(mmrLive.pluginVideos) ? mmrLive.pluginVideos : []), ...added].slice(0, 2);
                    if (typeof mmrLive.setPluginVideos === "function") mmrLive.setPluginVideos(next);
                    else mmrLive.pluginVideos = next;
                }
                return added.length;
            });
        };
        // 提示词类参数过滤：提示词由 agent 润色后经 nodeMapping.prompt 自动注入，
        // 不作为用户可调参数出现在暴露参数列表（输入区参数条 + 设置页编辑列表）
        const mmrNotPromptParam = (p) => {
            if (!p) return false;
            if (String(p.label) === "提示词") return false;
            if (p.type === "text" && (p.field === "prompt" || p.field === "text")) return false;
            return true;
        };
        // 素材-能力匹配校验（与后端 requiredAssetCheck 同语义，前端先拦避免无效提交与 LLM 静默换工作流）：
        // 返回错误消息或 null。只校验「明确不匹配/明确必需」的能力，不破坏 image-to-video 等宽松场景。
        const mmrCheckAssets = (cap, imageCount, videoCount) => {
            if (cap === "video-upscale" || cap === "video-to-audio") {
                if (videoCount === 0 && imageCount > 0) return "素材不匹配：当前工作流只接受视频输入，请移除图片素材";
                if (videoCount === 0) return "当前工作流需要输入视频素材：请通过「参考视频」按钮、把视频拖入输入框，或拖入后看到输入框上方的文件卡片再发送";
                return null;
            }
            if (cap === "image-and-video-to-video") {
                if (videoCount === 0 && imageCount === 0) return "当前工作流需要同时输入图片和视频素材（1 张人物图 + 1 段视频）";
                if (videoCount === 0) return "当前工作流还需要输入视频素材（仅有图片）：请通过「参考视频」按钮或把视频拖入输入框补充";
                if (imageCount === 0) return "当前工作流还需要输入图片素材（仅有视频），请在输入框添加图片";
                return null;
            }
            if (cap === "image-upscale" || cap === "remove-background" || cap === "image-to-3d") {
                if (imageCount === 0 && videoCount > 0) return "素材不匹配：当前工作流只接受图片输入，请移除视频素材";
                if (imageCount === 0) return "当前工作流需要输入图片素材，请在输入框添加图片";
                return null;
            }
            return null;
        };
        // 旧比例标签归一化：settings 持久化的旧 options（'9:16 (Vertical)'、裸 '4:3' 等）会被
        // ComfyUI ResolutionSelector /prompt 校验拒绝；渲染与提交时统一归一化到已装合法枚举
        //（与 comfy-provider.ts ratioMap 保持一致，不改用户 settings 文件本身）
        const MMR_RATIO_MAP = {
            "16:9": "16:9 (Widescreen)",
            "1:1": "1:1 (Square)",
            "9:16": "9:16 (Portrait Widescreen)",
            "4:3": "4:3 (Standard)",
            "3:4": "3:4 (Portrait Standard)",
            "21:9": "21:9 (Ultrawide)",
        };
        const mmrNormRatio = (v) => {
            if (typeof v !== "string" || !v.trim())
                return v;
            const s = v.trim();
            if (Object.values(MMR_RATIO_MAP).indexOf(s) >= 0)
                return s; // 已是合法完整标签
            const key = s.split(" ")[0];
            return MMR_RATIO_MAP[key] || s; // 旧标签/裸比例归一化；未知值原样（后端仍会兜底）
        };
        const mmrRecipesFor = (mode, groups) => {
            const def = MMR_MODES.find((m) => m.id === mode);
            if (!def)
                return [];
            const rows = [];
            for (const g of groups ?? [])
                if (def.caps.indexOf(g.type) >= 0)
                    for (const r of g.recipes ?? [])
                        if (r.enabled !== false)
                            rows.push({ id: r.id, name: r.name, capability: g.type, provider: r.provider ?? "comfy-local", defaults: r.defaults, nodeMapping: r.nodeMapping });
            return rows;
        };
        function ComposerMenuButton(props) {
            const { t } = props;
            const [open, setOpen] = react.useState(false);
            const chip = react.useSyncExternalStore(mmrSubscribe, mmrSnapshot);
            const pick = (mode) => {
                setOpen(false);
                if (chip.mode === mode)
                    mmrChipStore.set({ mode: null, recipeId: "", recipeCap: "" });
                else
                    mmrChipStore.set({ mode, recipeId: "", recipeCap: "" });
            };
            return (0, react_jsx_runtime.jsxs)("div", { className: "MMR_cmenuWrap", children: [
                    (0, react_jsx_runtime.jsx)("button", { type: "button", className: "MMR_cmenuBtn", title: t("mmrMenu"), onClick: () => setOpen(!open), children: "✦ " + t("mmrMenu") }),
                    (open ? (0, react_jsx_runtime.jsx)("div", { className: "MMR_cmenuBackdrop", onClick: () => setOpen(false) }) : null),
                    (open ? (0, react_jsx_runtime.jsx)("div", { className: "MMR_cmenuPop", children: MMR_MODES.map((m) => (0, react_jsx_runtime.jsx)("button", { type: "button", className: "MMR_cmenuItem", onClick: () => pick(m.id), children: (chip.mode === m.id ? "✓ " : "") + t(m.labelKey) }, m.id)) }) : null)
                ] });
        }
        function ComposerChipRow(props) {
            const { t, loadOverview, quickCreateTask } = props;
            const chip = react.useSyncExternalStore(mmrSubscribe, mmrSnapshot);
            const [groups, setGroups] = react.useState([]);
            const inputActions = props.inputActions;
            const draft = typeof props.useInput === "function" ? props.useInput((s) => s.draft) : "";
            // 宿主输入态只有 imageIds（无 attachments 字段）；图片数据经 conversation.serializeDraftImages 在发送瞬间读取
            const imageIds = typeof props.useInput === "function" ? props.useInput((s) => s.imageIds) : [];
            const draftRef = react.useRef("");
            draftRef.current = draft;
            const hadTextRef = react.useRef(false);
            // 新建对话自动退出：dock 槽随会话切换 remount。按 sessionId 判定——只有真的换了
            // 会话才清芯片与已拖素材；同会话 remount（视图切换/重挂载）不再吞掉用户已拖入的
            // 参考素材（旧实现「挂载即清零」是第二次尝试素材消失的根因之一）
            react.useEffect(() => {
                let sid = null;
                try {
                    const sessions = mmrRootCtx ? mmrRootCtx.get("sessions") : null;
                    sid = sessions ? (sessions.currentProvideInfo.getSnapshot().sessionId ?? null) : null;
                }
                catch (e) {
                    sid = null;
                }
                if (sid !== null && mmrLive.sessionId === sid)
                    return;
                mmrLive.sessionId = sid;
                mmrChipStore.set({ mode: null, recipeId: "", recipeCap: "", params: {} });
                if (mmrLive.setPluginVideos) mmrLive.setPluginVideos([]);
                if (mmrLive.setPluginImages) mmrLive.setPluginImages([]);
            }, []);
            // 插件侧参考视频（宿主输入框仅收 4 种图片 MIME，视频由此入口附加）：
            // React state 供渲染，mmrLive.pluginVideos 镜像供 submit 包装闭包读取
            const [plugVideos, setPlugVideos] = react.useState([]);
            const [vidErr, setVidErr] = react.useState("");
            // 插件侧参考图片：拖入混合批次（视频+图片）时由本插件接管，防 dsh-file-intake 把图片抢成 @路径附件
            const [plugImgs, setPlugImgs] = react.useState([]);
            // 素材-能力匹配错误提示（阻止提交，用户修正素材后重发）
            const [chipErr, setChipErr] = react.useState("");
            // 素材内联预览（芯片点击）：{dataUrl, name, video}
            const [preview, setPreview] = react.useState(null);
            react.useEffect(() => {
                if (preview === null) return;
                const onKey = (e) => {
                    if (e.key === "Escape") setPreview(null);
                };
                window.addEventListener("keydown", onKey);
                return () => window.removeEventListener("keydown", onKey);
            }, [preview]);
            // 芯片点击：内存里有 dataUrl 直接预览；没有（>30MB 只落盘）经服务端 previewMedia 取
            const previewChipMedia = async (entry) => {
                try {
                    if (entry && typeof entry.data === "string" && entry.data.startsWith("data:")) {
                        const isVideo = /^video\//.test(String(entry.mediaType || "")) || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(String(entry.name || ""));
                        setPreview({ dataUrl: entry.data, name: entry.name || "media", video: isVideo });
                        return;
                    }
                    if (entry && entry.rel && typeof props.previewMedia === "function") {
                        const r = await props.previewMedia({ rel: entry.rel });
                        if (r && r.dataUrl) {
                            setPreview({ dataUrl: r.dataUrl, name: r.name || entry.name || "media", video: /^video\//.test(String(r.mime || "")) });
                            return;
                        }
                    }
                    setVidErr("该素材暂无可预览内容，请右键打开所在位置");
                }
                catch (e) {
                    setVidErr(String((e && e.message) || e));
                }
            };
            // 芯片右键：在资源管理器中定位素材本地文件（需已落盘的 rel）
            const revealChipMedia = (entry) => {
                if (!entry || !entry.rel || typeof props.revealMedia !== "function") {
                    setVidErr("该素材尚未落盘（发送时才交接），暂无法定位");
                    return;
                }
                Promise.resolve(props.revealMedia({ rel: entry.rel })).catch((e) => setVidErr(String((e && e.message) || e)));
            };
            mmrLive.pluginVideos = plugVideos;
            mmrLive.setPluginVideos = (next) => {
                mmrLive.pluginVideos = next;
                setPlugVideos(next);
            };
            mmrLive.pluginImages = plugImgs;
            mmrLive.setPluginImages = (next) => {
                mmrLive.pluginImages = next;
                setPlugImgs(next);
            };
            const onVideoFiles = async (fileList) => {
                const list = Array.from(fileList || []);
                const cur = Array.isArray(mmrLive.pluginVideos) ? mmrLive.pluginVideos : [];
                if (list.length === 0) return;
                if (cur.length >= 2) {
                    setVidErr("最多附加 2 个参考视频");
                    return;
                }
                const oversize = list.some((f) => f.size > 200 * 1024 * 1024);
                const added = await mmrIngestVideos(list);
                if (oversize) setVidErr("单个视频不能超过 200MB");
                else if (added > 0) setVidErr("");
            };
            react.useEffect(() => {
                let alive = true;
                Promise.resolve().then(() => loadOverview()).then((snap) => {
                    if (alive)
                        setGroups(Array.isArray(snap.capabilities) ? snap.capabilities : []);
                }, () => { });
                return () => { alive = false; };
            }, [loadOverview, chip.mode]);
            const rows = react.useMemo(() => mmrRecipesFor(chip.mode, groups), [chip.mode, groups]);
            // 模式切换/列表就绪后校正选中项（当前 recipeId+capability 不属于该模式时落到第一项；同 recipe 多 capability 需按 cap 区分）
            react.useEffect(() => {
                if (!chip.mode)
                    return;
                if (chip.recipeId && rows.some((r) => r.id === chip.recipeId && r.capability === chip.recipeCap))
                    return;
                mmrChipStore.set({ recipeId: rows[0] ? rows[0].id : "", recipeCap: rows[0] ? rows[0].capability : "" });
            }, [chip.mode, chip.recipeId, chip.recipeCap, rows]);
            // 模式切换后比例不在该模式列表时，落回该模式第一个比例
            react.useEffect(() => {
                if (!chip.mode)
                    return;
                const ratios = mmrRatiosOf(chip.mode);
                if (!ratios.some((r) => r[0] === chip.ratio))
                    mmrChipStore.set({ ratio: ratios[0][0] });
            }, [chip.mode]);
            // 芯片选择上报：持续镜像到运行时（media_capabilities 带给 LLM）。替代旧的
            // 「改写用户消息注入 hint」——提交不再改提示词，LLM 也能按所选工作流生成。
            react.useEffect(() => {
                if (typeof props.setComposerSelection !== "function")
                    return;
                if (!chip.mode) {
                    Promise.resolve(props.setComposerSelection(null)).catch(() => { });
                    return;
                }
                const rowSel = rows.find((r) => r.id === chip.recipeId && r.capability === chip.recipeCap)
                    || (rows.find((r) => r.id === chip.recipeId) ?? null);
                const fallbackCap = chip.mode === "image" ? "text-to-image" : chip.mode === "video" ? "image-to-video" : "text-to-audio";
                Promise.resolve(props.setComposerSelection({
                    mode: chip.mode,
                    capability: rowSel ? rowSel.capability : fallbackCap,
                    recipeId: rowSel && rowSel.id ? rowSel.id : null,
                    recipeName: rowSel ? rowSel.name : null,
                    duration: chip.mode === "video" ? (typeof chip.duration === "number" ? chip.duration : 5) : null,
                    ratio: chip.ratio ?? null,
                    params: chip.params && Object.keys(chip.params).length > 0 ? chip.params : null,
                })).catch(() => { });
            }, [chip.mode, chip.recipeId, chip.recipeCap, chip.duration, chip.ratio, chip.params, rows, props.setComposerSelection]);

            const currentRecipe = rows.find((r) => r.id === chip.recipeId && r.capability === chip.recipeCap) || rows.find((r) => r.id === chip.recipeId) || null;
            const customExposed = (currentRecipe?.defaults?.exposedParams || currentRecipe?.nodeMapping?.exposedParams || []).filter(mmrNotPromptParam);

            // 发送瞬间快速直调：包装 inputActions.submit（WeakSet 防重）；芯片激活时直调
            // quickCreateTask 创建任务（草稿参考图转 Base64 提交，避免使用旧图片缓存）；
            // 草稿读写语义见包装内注释（实时草稿优先，成功不回写）
            mmrLive.rows = rows;
            mmrLive.draft = draft;
            mmrLive.imageIds = imageIds;
            mmrLive.serializeDraftImages = typeof props.serializeDraftImages === "function" ? props.serializeDraftImages : null;
            react.useEffect(() => {
                if (!inputActions || typeof inputActions.submit !== "function" || mmrWrappedSubmits.has(inputActions))
                    return;
                mmrWrappedSubmits.add(inputActions);
                const origSubmit = inputActions.submit.bind(inputActions);
                const origSetDraft = inputActions.setDraft.bind(inputActions);
                inputActions.submit = async function (...args) {
                    const chipNow = mmrChipStore.state;
                    if (chipNow.mode) {
                        // 实时草稿优先：file-intake 的 submit 包装在本包装外层，同一 tick 内刚把清洗后的
                        // 正文与 @路径 setDraft 进宿主 input registry——渲染期快照 mmrLive.draft 必然陈旧
                        // （旧实现拿它整体覆盖回草稿，正是拖入附件消失的根因）。registry 读取失败时退回
                        // 快照读，但此后绝不写草稿：提交不改变提示词，素材的 @路径 可见性由
                        // file-intake 的正常注入保证（交接知会不会把它们从消息里摘掉）。
                        const liveD = mmrLiveDraft();
                        const canPatch = liveD !== null;
                        const d = liveD !== null ? liveD : mmrLive.draft;
                        if (d && d.trim()) {
                            // 交接素材（交接钩子在本包装执行前一刻写入）：消费即清零，只用于把素材
                            // 路径交给直调任务。素材的 @路径 已由 file-intake 照常注入消息（对话可见）。
                            // 超过 2 秒的残留交接直接丢弃。
                            const claimedAssets = (Array.isArray(mmrClaimed.pending) && Date.now() - mmrClaimed.at < 2000)
                                ? mmrClaimed.pending
                                : [];
                            mmrClaimed.pending = [];
                            mmrClaimed.at = 0;
                            // 音频模式：跳过直调走 LLM 需求解析链路（TTS 声线指令需语义理解）。
                            // 提交绝不改变提示词：不再注入 tag/hint；芯片里选的模式/工作流已由
                            // setComposerSelection 持续上报，LLM 经 media_capabilities 的
                            // composerSelection 感知并按其生成。
                            if (chipNow.mode === "audio") {
                                return origSubmit(...args);
                            }
                            const { row, cap } = mmrCapOfChip(chipNow);
                            const def = MMR_MODES.find((m) => m.id === chipNow.mode);
                            const ratios = def && def.sized ? mmrRatiosOf(chipNow.mode) : null;
                            const size = ratios ? (ratios.find((r) => r[0] === chipNow.ratio) ?? ratios[0]) : null;
                            // payload.prompt 只取用户纯正文：剥零宽占位符 + 剥 file-intake 注入的 @.dsh/uploads/
                            // 引用行（写回/发送的草稿仍保留完整实时内容）；正文为空时不直调
                            const promptText = mmrPromptOf(d);
                            const payload = { capability: cap, prompt: promptText };
                            setChipErr("");
                            if (row && row.id)
                                payload.recipeId = row.id;
                            if (size) {
                                payload.width = size[1];
                                payload.height = size[2];
                            }
                            if (chipNow.mode === "video") {
                                payload.duration = typeof chipNow.duration === "number" ? chipNow.duration : 5;
                            }
                            if (chipNow.params && Object.keys(chipNow.params).length > 0) {
                                payload.params = { ...chipNow.params };
                                const expList = row?.defaults?.exposedParams || row?.nodeMapping?.exposedParams || [];
                                for (const ep of expList) {
                                    const v = chipNow.params[ep.id];
                                    if (v !== undefined) {
                                        // 通用：按 field 语义键回填 payload.params，后端 inputs[field] 才能被
                                        // buildNodeInfoList 的 mapping.params[field] 取到（否则 ep.id 键如
                                        // app-resolution-88 与 mapping.params 的 field 键 resolution 对不上，
                                        // 分辨率等参数值丢失）
                                        if (ep.field && ep.field !== ep.id)
                                            payload.params[ep.field] = v;
                                        // 比例值归一化提交（settings 旧标签 → 合法枚举；后端 ratioMap 双保险）
                                        if (ep.field === "aspect_ratio") payload.aspect_ratio = mmrNormRatio(String(v));
                                        if (ep.field === "megapixels") payload.megapixels = Number(v);
                                        if (ep.field === "duration") payload.duration = Number(v);
                                    }
                                }
                            }
                            // 草稿图片：经宿主 conversation 服务序列化 imageIds（返回裸 base64）→ dataUrl 形状；
                            // 服务不可用或序列化失败时回退空数组（退化为纯文本生成，不阻断发送）
                            let atts = [];
                            try {
                                const ids = Array.isArray(mmrLive.imageIds) ? mmrLive.imageIds : [];
                                if (ids.length > 0 && mmrLive.serializeDraftImages) {
                                    const serialized = await mmrLive.serializeDraftImages(ids);
                                    atts = (Array.isArray(serialized) ? serialized : []).map((a) => ({
                                        mediaType: a.mediaType || "image/png",
                                        data: typeof a.data === "string" && a.data.startsWith("data:")
                                            ? a.data
                                            : "data:" + (a.mediaType || "image/png") + ";base64," + (a.data || ""),
                                        name: a.name || "image.png"
                                    }));
                                }
                            } catch (e) {
                                console.error("[MMR] serializeDraftImages error:", e);
                            }
                            const readAtt = (att) => {
                                if (!att) return Promise.resolve(null);
                                const file = att.file || att.rawFile || att.blob || (att instanceof Blob ? att : null);
                                if (file instanceof Blob) {
                                    return new Promise((resolve) => {
                                        const reader = new FileReader();
                                        reader.onload = () => resolve({
                                            mediaType: file.type || att.type || "image/png",
                                            data: typeof reader.result === "string" ? reader.result : "",
                                            name: file.name || att.name || "image.png"
                                        });
                                        reader.onerror = () => resolve(null);
                                        reader.readAsDataURL(file);
                                    });
                                }
                                const url = att.previewUrl || att.url || att.src || att.dataUrl || att.data;
                                if (typeof url === "string") {
                                    if (url.startsWith("data:")) {
                                        return Promise.resolve({
                                            mediaType: att.mediaType || att.type || "image/png",
                                            data: url,
                                            name: att.name || "attachment.png"
                                        });
                                    }
                                    if (url.startsWith("blob:") || url.startsWith("http")) {
                                        return fetch(url)
                                            .then((r) => r.blob())
                                            .then((blob) => new Promise((resolve) => {
                                                const reader = new FileReader();
                                                reader.onload = () => resolve({
                                                    mediaType: blob.type || att.type || "image/png",
                                                    data: typeof reader.result === "string" ? reader.result : "",
                                                    name: att.name || "attachment.png"
                                                });
                                                reader.onerror = () => resolve(null);
                                                reader.readAsDataURL(blob);
                                            }))
                                            .catch(() => null);
                                    }
                                }
                                return Promise.resolve(null);
                            };
                            if (Array.isArray(atts) && atts.length > 0) {
                                try {
                                    const parsed = (await Promise.all(atts.map(readAtt))).filter(Boolean);
                                    const validImages = parsed.filter((p) => !String(p.mediaType || "").startsWith("video/"));
                                    const validVideos = parsed.filter((p) => String(p.mediaType || "").startsWith("video/"));
                                    if (validImages.length > 0) {
                                        payload.images = validImages;
                                        if (payload.capability === "text-to-image") {
                                            payload.capability = "image-to-image";
                                        }
                                    }
                                    if (validVideos.length > 0) {
                                        payload.videos = validVideos;
                                        if (payload.capability === "text-to-video") {
                                            payload.capability = "image-to-video";
                                        }
                                    }
                                } catch (e) {
                                    console.error("[MMR] parse attachments error:", e);
                                }
                            }
                            // 插件侧素材并入 payload（「📎 参考视频」/拖入捕获，均已落盘带 rel）：
                            // 有 rel 的走路径交接（大视频不过 base64 JSON 通道），没有的退回 base64。
                            // 清理时机后移到直调成功后：校验失败或素材错误时保留，用户修正素材后可直接重发。
                            const plugVids = Array.isArray(mmrLive.pluginVideos) ? mmrLive.pluginVideos : [];
                            if (plugVids.length > 0) {
                                const vidRels = plugVids.map((v) => String(v.rel || "")).filter(Boolean);
                                const vidB64 = plugVids.filter((v) => !v.rel);
                                if (vidRels.length > 0) {
                                    payload.videoPaths = [...(Array.isArray(payload.videoPaths) ? payload.videoPaths : []), ...vidRels].slice(0, 2);
                                }
                                if (vidB64.length > 0) {
                                    payload.videos = [...(Array.isArray(payload.videos) ? payload.videos : []), ...vidB64].slice(0, 2);
                                }
                                if (payload.capability === "text-to-video") {
                                    payload.capability = "image-to-video";
                                }
                            }
                            const plugPics = Array.isArray(mmrLive.pluginImages) ? mmrLive.pluginImages : [];
                            if (plugPics.length > 0) {
                                const picRels = plugPics.map((v) => String(v.rel || "")).filter(Boolean);
                                const picB64 = plugPics.filter((v) => !v.rel);
                                if (picRels.length > 0) {
                                    payload.imagePaths = [...(Array.isArray(payload.imagePaths) ? payload.imagePaths : []), ...picRels].slice(0, 4);
                                }
                                if (picB64.length > 0) {
                                    payload.images = [...(Array.isArray(payload.images) ? payload.images : []), ...picB64].slice(0, 4);
                                }
                                if (payload.capability === "text-to-image") {
                                    payload.capability = "image-to-image";
                                }
                            }
                            // file-intake 认领素材：以工作区相对路径交接（服务端读盘 → 去重落盘 → 登记资产），
                            // 不走 base64——大视频过 JSON 通道既慢又可能超限
                            const claimedVids = claimedAssets.filter((e) => mmrMediaKindOf(e) === "video");
                            const claimedPics = claimedAssets.filter((e) => mmrMediaKindOf(e) === "image");
                            if (claimedVids.length > 0) {
                                payload.videoPaths = claimedVids.map((e) => String(e.rel || "")).filter(Boolean).slice(0, 2);
                                if (payload.capability === "text-to-video") {
                                    payload.capability = "image-to-video";
                                }
                            }
                            if (claimedPics.length > 0) {
                                payload.imagePaths = claimedPics.map((e) => String(e.rel || "")).filter(Boolean).slice(0, 4);
                                if (payload.capability === "text-to-image") {
                                    payload.capability = "image-to-image";
                                }
                            }
                            // 素材-能力匹配校验（交接素材按路径计入）：不匹配明确报错并阻止提交
                            //（不生成、不 LLM 兜底）；素材 @路径 本就在消息里，无需恢复
                            const assetErr = mmrCheckAssets(payload.capability,
                                (payload.images || []).length + (payload.imagePaths || []).length,
                                (payload.videos || []).length + (payload.videoPaths || []).length);
                            if (assetErr) {
                                setChipErr(assetErr);
                                return;
                            }
                            let quickOk = false;
                            if (promptText && typeof quickCreateTask === "function") {
                                try {
                                    await quickCreateTask(payload);
                                    quickOk = true;
                                } catch (err) {
                                    console.error("[MMR] quickCreateTask error:", err);
                                    // 直调失败：拦截发送并明确报错——不改用户提示词去走 LLM 兜底
                                    //（那会产生换工作流/丢参数/改写消息）；素材 @路径 本就在消息里不丢
                                    const msg = String(err && err.message ? err.message : err);
                                    setChipErr("任务创建失败：" + msg);
                                    return;
                                }
                            }
                            if (quickOk) {
                                // 素材引用随消息发出（对话里可见）：芯片激活时拖入的素材走 MMR 捕获
                                // （file-intake 不经手，消息里本来不会有 @路径），这里按 file-intake 的
                                // 附件语义在正文之后补 @路径 行——只追加文件引用，不动用户正文。
                                const materialRels = [...plugVids, ...plugPics]
                                    .map((v) => String(v.rel || ""))
                                    .filter((rel) => rel && d.indexOf("@" + rel) < 0);
                                if (materialRels.length > 0 && canPatch) {
                                    const block = materialRels.map((rel) => "@" + rel).join("\n");
                                    origSetDraft(d.endsWith("\n") ? d + block + "\n" : d + "\n" + block + "\n");
                                }
                                if (plugVids.length > 0 && typeof mmrLive.setPluginVideos === "function")
                                    mmrLive.setPluginVideos([]);
                                if (plugPics.length > 0 && typeof mmrLive.setPluginImages === "function")
                                    mmrLive.setPluginImages([]);
                            }
                        }
                    }
                    return origSubmit(...args);
                };
            }, [inputActions, quickCreateTask]);
            // 发送后草稿被清空 → 自动收回芯片（指令已随消息发出）。
            // 关闭时必须重置 hadTextRef：否则同对话再次开启模式时，draft="" + 残留 true 会立即把
            // 模式关回（用户看到「点多模态生成没反应」，刷新 remount 才恢复）
            react.useEffect(() => {
                if (!chip.mode)
                    return;
                if (draft === "") {
                    if (hadTextRef.current) {
                        hadTextRef.current = false;
                        mmrChipStore.set({ mode: null, recipeId: "", recipeCap: "", params: {} });
                    }
                }
                else {
                    hadTextRef.current = true;
                }
            }, [draft, chip.mode]);
            if (!chip.mode)
                return null;
            const def = MMR_MODES.find((m) => m.id === chip.mode);
            const close = () => {
                hadTextRef.current = false;
                mmrChipStore.set({ mode: null, recipeId: "", recipeCap: "", params: {} });
            };
            const minDur = currentRecipe?.defaults?.minDuration ?? 1;
            const maxDur = currentRecipe?.defaults?.maxDuration ?? 15;
            const curDur = typeof chip.duration === "number" ? Math.max(minDur, Math.min(maxDur, chip.duration)) : (currentRecipe?.defaults?.duration ?? Math.min(5, maxDur));

            return (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [
                    (0, react_jsx_runtime.jsxs)("div", { className: "MMR_chipRow", children: [
                    (0, react_jsx_runtime.jsxs)("span", { className: "MMR_chip", children: [
                            t(def.labelKey),
                            (0, react_jsx_runtime.jsx)("button", { type: "button", className: "MMR_chipX", title: "×", onClick: close, children: "×" })
                        ] }),
                    (0, react_jsx_runtime.jsx)("span", { className: "MMR_chipLabel", children: t("chipWorkflow") }),
                    (0, react_jsx_runtime.jsxs)("select", { className: "MMR_chipSel", value: chip.recipeId && chip.recipeCap ? chip.recipeId + "@" + chip.recipeCap : "", onChange: (event) => {
                            const v = event.currentTarget.value;
                            if (!v) {
                                mmrChipStore.set({ recipeId: "", recipeCap: "" });
                                return;
                            }
                            const at = v.lastIndexOf("@");
                            mmrChipStore.set({ recipeId: v.slice(0, at), recipeCap: v.slice(at + 1) });
                        }, children: [
                            (0, react_jsx_runtime.jsx)("option", { value: "", children: t("defaultRoute") }),
                            ...MMR_CHIP_GROUPS.map(function (grp) {
                                const sub = rows.filter((r) => r.provider === grp[0]);
                                return sub.length === 0 ? null : (0, react_jsx_runtime.jsx)("optgroup", { label: t(grp[1]), children: sub.map((r) => (0, react_jsx_runtime.jsx)("option", { value: r.id + "@" + r.capability, children: r.name + "（" + r.capability + "）" }, r.id + "@" + r.capability)) }, grp[0]);
                            })
                        ] }),
                    ...(customExposed.length > 0 ? customExposed.map((p) => {
                        const currentVal = chip.params?.[p.id] ?? p.default;
                        if (p.type === "select") {
                            // 比例下拉：旧标签归一化显示（去重）；其余参数原样
                            const isRatio = p.field === "aspect_ratio" || String(p.field).includes("ratio");
                            const opts = isRatio
                                ? Array.from(new Set((p.options || []).map((opt) => mmrNormRatio(opt))))
                                : (p.options || []);
                            // SWITCH/枚举参数：optionValues 是提交值（如超分「放大2倍/4倍」的 index），与 options 一一对应
                            const hasVals = Array.isArray(p.optionValues) && p.optionValues.length === opts.length;
                            const vals = hasVals ? p.optionValues.map((v) => String(v)) : opts;
                            const cur = isRatio && currentVal !== undefined ? mmrNormRatio(String(currentVal)) : (currentVal !== undefined ? String(currentVal) : "");
                            return (0, react_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" }, children: [
                                (0, react_jsx_runtime.jsx)("span", { className: "MMR_chipLabel", children: p.label + ":" }),
                                (0, react_jsx_runtime.jsx)("select", {
                                    className: "MMR_chipSel",
                                    value: cur || vals[0] || "",
                                    onChange: (e) => mmrChipStore.set({ params: { ...(chip.params || {}), [p.id]: e.currentTarget.value } }),
                                    children: opts.map((opt, i) => (0, react_jsx_runtime.jsx)("option", { value: vals[i], children: opt }, vals[i] + ":" + opt))
                                })
                            ] }, p.id);
                        }
                        if (p.type === "slider") {
                            const sMin = p.min ?? 0;
                            const sMax = p.max ?? 100;
                            const sStep = p.step ?? 1;
                            const numVal = typeof currentVal === "number" ? currentVal : sMin;
                            return (0, react_jsx_runtime.jsxs)("span", {
                                className: "MMR_chipSliderWrap",
                                style: { display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "4px" },
                                children: [
                                    (0, react_jsx_runtime.jsx)("span", {
                                        className: "MMR_chipLabel",
                                        style: { color: "var(--dsw-alias-label-secondary)" },
                                        children: p.label + ": " + numVal
                                    }),
                                    (0, react_jsx_runtime.jsx)("input", {
                                        type: "range",
                                        className: "MMR_chipSlider",
                                        style: { width: "70px", height: "4px", accentColor: "var(--dsw-alias-color-primary, #3b82f6)", cursor: "pointer" },
                                        min: sMin,
                                        max: sMax,
                                        step: sStep,
                                        value: numVal,
                                        onChange: (e) => mmrChipStore.set({ params: { ...(chip.params || {}), [p.id]: Number(e.currentTarget.value) } })
                                    })
                                ]
                            }, p.id);
                        }
                        if (p.type === "number") {
                            return (0, react_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" }, children: [
                                (0, react_jsx_runtime.jsx)("span", { className: "MMR_chipLabel", children: p.label + ":" }),
                                (0, react_jsx_runtime.jsx)("input", {
                                    type: "number",
                                    className: "MMR_chipSel",
                                    style: { width: "48px", height: "20px", padding: "0 2px" },
                                    min: p.min,
                                    max: p.max,
                                    step: p.step,
                                    value: currentVal !== undefined ? Number(currentVal) : "",
                                    onChange: (e) => mmrChipStore.set({ params: { ...(chip.params || {}), [p.id]: Number(e.currentTarget.value) } })
                                })
                            ] }, p.id);
                        }
                        return (0, react_jsx_runtime.jsx)("input", {
                            type: "text",
                            className: "MMR_chipSel",
                            style: { width: "80px", height: "20px", padding: "0 4px" },
                            placeholder: p.label,
                            value: currentVal !== undefined ? String(currentVal) : "",
                            onChange: (e) => mmrChipStore.set({ params: { ...(chip.params || {}), [p.id]: e.currentTarget.value } })
                        }, p.id);
                    }) : [
                        (def.sized ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_chipLabel", children: t("chipRatio") }) : null),
                        (def.sized ? (0, react_jsx_runtime.jsx)("select", { className: "MMR_chipSel", value: chip.ratio, onChange: (event) => mmrChipStore.set({ ratio: event.currentTarget.value }), children: mmrRatiosOf(chip.mode).map((r) => (0, react_jsx_runtime.jsx)("option", { value: r[0], children: r[0] }, r[0])) }) : null)
                    ]),
                    // 视频模式时长滑块常显：recipe 暴露参数不含 duration 时也要有时长控制
                    //（否则 customExposed 只暴露比例/像素时视频模式丢失时长调节）
                    ...(chip.mode === "video" && !customExposed.some((p) => p.field === "duration") ? [(0, react_jsx_runtime.jsxs)("span", {
                        className: "MMR_chipSliderWrap",
                        style: { display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "4px" },
                        children: [
                            (0, react_jsx_runtime.jsx)("span", {
                                className: "MMR_chipLabel",
                                style: { color: "var(--dsw-alias-label-secondary)" },
                                children: "时长: " + curDur + "秒"
                            }),
                            (0, react_jsx_runtime.jsx)("input", {
                                type: "range",
                                className: "MMR_chipSlider",
                                style: { width: "80px", height: "4px", accentColor: "var(--dsw-alias-color-primary, #3b82f6)", cursor: "pointer" },
                                min: minDur,
                                max: maxDur,
                                step: 1,
                                value: curDur,
                                onChange: (event) => mmrChipStore.set({ duration: Number(event.currentTarget.value) })
                            })
                        ]
                    })] : []),
                    // 插件侧参考视频入口：宿主输入框仅收 PNG/JPG/WebP/GIF，视频由此附加（≤2 个）
                    ...(chip.mode === "video" ? [
                        (0, react_jsx_runtime.jsxs)("span", { className: "MMR_chip", style: { cursor: "pointer", position: "relative", overflow: "hidden" }, title: "上传参考视频（宿主输入框仅支持图片，视频经此入口附加，最多 2 个）", children: [
                                "📎 参考视频",
                                (0, react_jsx_runtime.jsx)("input", { type: "file", accept: "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/*", multiple: true, style: { position: "absolute", left: 0, top: 0, width: "1px", height: "1px", opacity: 0 }, onChange: (event) => {
                                        Promise.resolve(onVideoFiles(event.currentTarget.files)).then(() => {
                                            event.currentTarget.value = "";
                                        });
                                    } })
                            ] }),
                        ...plugVideos.map((v, i) => (0, react_jsx_runtime.jsxs)("span", { className: "MMR_chip", style: { cursor: "pointer" }, title: (v.name || "参考视频") + (v.rel ? "\n" + v.rel + "\n点击：预览　右键：打开素材所在位置" : "\n点击：预览"), onClick: () => void previewChipMedia(v), onContextMenu: (event) => { event.preventDefault(); revealChipMedia(v); }, children: [
                                "🎬 " + ((v.name || "video").length > 14 ? String(v.name || "video").slice(0, 12) + "…" : String(v.name || "video")),
                                (0, react_jsx_runtime.jsx)("button", { type: "button", className: "MMR_chipX", title: "移除", onClick: (event) => { event.stopPropagation(); mmrLive.setPluginVideos(plugVideos.filter((_, j) => j !== i)); }, onContextMenu: (event) => event.stopPropagation(), children: "×" })
                            ] }, "mmr-plugvid-" + i)),
                        ...plugImgs.map((v, i) => (0, react_jsx_runtime.jsxs)("span", { className: "MMR_chip", style: { cursor: "pointer" }, title: (v.name || "参考图片") + (v.rel ? "\n" + v.rel + "\n点击：预览　右键：打开素材所在位置" : "\n点击：预览"), onClick: () => void previewChipMedia(v), onContextMenu: (event) => { event.preventDefault(); revealChipMedia(v); }, children: [
                                "🖼 " + ((v.name || "image").length > 14 ? String(v.name || "image").slice(0, 12) + "…" : String(v.name || "image")),
                                (0, react_jsx_runtime.jsx)("button", { type: "button", className: "MMR_chipX", title: "移除", onClick: (event) => { event.stopPropagation(); mmrLive.setPluginImages(plugImgs.filter((_, j) => j !== i)); }, onContextMenu: (event) => event.stopPropagation(), children: "×" })
                            ] }, "mmr-plugimg-" + i)),
                        (vidErr ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_chipLabel", style: { color: "var(--dsw-alias-color-danger, #e5484d)" }, children: vidErr }) : null)
                    ] : []),
                    (rows.length === 0 ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_chipLabel", children: t("noWorkflowHint") }) : null),
                    // 素材-能力匹配错误：所有模式可见（阻止提交，用户修正素材后重发）
                    (chipErr ? (0, react_jsx_runtime.jsx)("span", { className: "MMR_chipLabel", style: { color: "var(--dsw-alias-color-danger, #e5484d)", fontWeight: 600 }, children: chipErr }) : null)
                ] }),
                // 素材预览灯箱（芯片点击；Esc/遮罩/×关闭）
                (preview ? (0, react_jsx_runtime.jsxs)("div", { className: "MMR_lightboxBackdrop", onClick: () => setPreview(null), children: [
                        (0, react_jsx_runtime.jsxs)("div", { className: "MMR_lightboxHeader", children: [
                                (0, react_jsx_runtime.jsx)("span", { className: "MMR_lightboxPrompt", children: preview.name }),
                                (0, react_jsx_runtime.jsx)("button", { type: "button", className: "MMR_lightboxClose", onClick: () => setPreview(null), children: "×" })
                            ] }),
                        (0, react_jsx_runtime.jsx)("div", { className: "MMR_lightboxBody", onClick: () => setPreview(null), children: (preview.video
                                ? (0, react_jsx_runtime.jsx)("video", { className: "MMR_lightboxMedia", src: preview.dataUrl, controls: true, autoPlay: true, onClick: (event) => event.stopPropagation(), style: { maxHeight: "84vh", borderRadius: "12px", background: "#000" } })
                                : (0, react_jsx_runtime.jsx)("img", { className: "MMR_lightboxMedia", src: preview.dataUrl, alt: preview.name })) })
                    ] }) : null)
            ] });
        }
        // ── cordis 插件体 ─────────────────────────────────────────────────────
        const inject = ["slots", "locale", "remote", "sessions"];
        function apply(ctx) {
            mmrRootCtx = ctx; // mmrLiveDraft / mount 判定经宿主 sessions + conversation.input 读实时状态
            ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-multimodal-runtime: dictionaries");
            // 视频拖入捕获：video 模式激活时，capture 阶段拦截拖入输入框的视频进 pluginVideos。
            // 本插件在 bundles 中先于 dsh-file-intake 加载，capture 监听先注册先执行，
            // stopImmediatePropagation 阻止 dsh-file-intake 把视频当通用附件拦截成 @路径
            //（否则多模态收不到视频素材，视频+图片一起提交时素材消失）。
            ctx.effect(() => {
                const isVideoFile = (f) => /^video\//.test(f.type || "") || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(f.name || "");
                const onDrop = (event) => {
                    if (mmrChipStore.state.mode !== "video") return;
                    const dt = event.dataTransfer;
                    if (!dt || !Array.from(dt.types || []).includes("Files")) return;
                    const files = dt.files;
                    if (!files || files.length === 0) return;
                    const list = Array.from(files);
                    const vids = list.filter(isVideoFile);
                    if (vids.length === 0) return;
                    // 设置页自己的拖放区（工作流导入等）不劫持：drop 交给目标元素处理
                    const targetEl = event.target instanceof Element ? event.target : null;
                    if (targetEl && targetEl.closest(".MMR_section, [data-dsh-native-dropzone]")) return;
                    // 含视频的批次整体接管：视频进 pluginVideos、图片进 pluginImages——
                    // 否则 dsh-file-intake 会把混合批次（含图片）整个拦成 @路径附件，多模态素材全丢
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    // 抢占了 drop 之后 file-intake 的 window drop 监听不会执行，其全屏
                    // 「松开鼠标添加文件」遮罩会因此滞留（OS 文件拖拽页面收不到原生
                    // dragend）；补发合成 dragend 让其立即复位（与 file-intake 同一手）。
                    try { window.dispatchEvent(new Event("dragend")); } catch (e) { /* ignore */ }
                    const imgs = list.filter((f) => !isVideoFile(f));
                    void mmrIngestVideos(vids);
                    if (imgs.length > 0) void mmrIngestImages(imgs);
                };
                window.addEventListener("drop", onDrop, true);
                return () => window.removeEventListener("drop", onDrop, true);
            }, "mmr: 视频拖入捕获");
            const t = ctx.locale.bind(NS);
            const mount = ctx.remote.$mount(CONTRIBUTION);
            const callRemote = async (method, ...args) => {
                await mount;
                const remote = ctx.get("remote.mediaSettings");
                const result = await remote[method](...args);
                if (!result.ok)
                    throw new Error("mediaSettings." + method + " failed: " + result.error.code + ": " + result.error.message);
                return result.value;
            };
            // 模块级桥：拖入/参考视频摄入（mmrIngestVideos/Images）经此落盘换取 rel 路径交接
            mmrLive.ingestMedia = (payload) => callRemote("ingestMedia", mmrCurrentSessionId(), payload);
            const sectionFace = () => ({
                loadOverview: () => callRemote("overview"),
                setRecipeEnabled: (payload) => callRemote("setEnabled", payload),
                setCapabilityDefault: (payload) => callRemote("setCapabilityDefault", payload),
                updateRecipe: (payload) => callRemote("updateRecipe", payload),
                listProviders: () => callRemote("listProviders"),
                setProviderConfig: (payload) => callRemote("setProviderConfig", payload),
                importWorkflow: (payload) => callRemote("importWorkflow", payload),
                autoImportComfy: (payload) => callRemote("autoImportComfy", payload),
                autoImportRunningHub: (payload) => callRemote("autoImportRunningHub", payload),
                addOpenRouter: (payload) => callRemote("addOpenRouter", payload),
                verifyRunningHubKey: (payload) => callRemote("verifyRunningHubKey", payload),
                resolveOpenRouterModel: (payload) => callRemote("resolveOpenRouterModel", payload),
                addRunningHubApp: (payload) => callRemote("addRunningHubApp", payload),
                addRunningHubEndpoint: (payload) => callRemote("addRunningHubEndpoint", payload),
                refreshRhCatalog: (payload) => callRemote("refreshRhCatalog", payload),
                deleteRecipe: (payload) => callRemote("deleteRecipe", payload),
                updateRecipeMeta: (payload) => callRemote("updateRecipeMeta", payload),
                inspectWorkflowNodes: (payload) => callRemote("inspectWorkflowNodes", payload)
            });
            // 注册“多模态生成”设置栏（order 17，位于技能 16 与 agent 预设 20 之间）。
            ctx.slots.inject("settings.section", () => ctx.slots.register({
                name: "settings.section",
                id: "media",
                order: 17,
                label: () => t("nav"),
                locale: NS,
                inject: sectionFace
            }, MediaSection));
            // 对话内媒体任务进度卡片：按 wire 工具名注册进 ui-tool 的 keyed toolview 槽。
            const cardFace = () => ({
                snapshot: (taskId) => callRemote("taskSnapshot", { taskId }),
                revealAsset: (payload) => callRemote("revealAsset", payload)
            });
            ctx.slots.inject("tool.call.toolview", function* () {
                yield ctx.slots.register({ name: "tool.call.toolview", key: "media_create_task", locale: NS, inject: cardFace }, MediaTaskCard);
                yield ctx.slots.register({ name: "tool.call.toolview", key: "media_task_status", locale: NS, inject: cardFace }, MediaTaskCard);
            });
            // 对话框多模态生成：工具行菜单按钮（input.left）+ 输入区上方参数芯片条（input.dock）。
            // 发送瞬间客户端直调 quickCreateTask 创建任务，进度由对话内工具卡片展示。
            // 素材相关调用都带当前 sessionId：服务端按会话工作区解析 .dsh/uploads 相对路径。
            const composerFace = () => ({
                loadOverview: () => callRemote("overview"),
                quickCreateTask: (payload) => callRemote("quickCreateTask", mmrCurrentSessionId(), payload),
                ingestMedia: (payload) => callRemote("ingestMedia", mmrCurrentSessionId(), payload),
                previewMedia: (payload) => callRemote("previewMedia", mmrCurrentSessionId(), payload),
                openMedia: (payload) => callRemote("openMedia", mmrCurrentSessionId(), payload),
                revealMedia: (payload) => callRemote("revealMedia", mmrCurrentSessionId(), payload),
                setComposerSelection: (payload) => callRemote("setComposerSelection", mmrCurrentSessionId(), payload),
                taskSnapshot: (taskId) => callRemote("taskSnapshot", { taskId }),
                // 草稿图片序列化：经宿主 conversation 服务把 imageIds 转为 base64（SubmitImageAttachment 形状）
                serializeDraftImages: (ids) => {
                    const conv = ctx.get("conversation");
                    if (!conv || typeof conv.serializeDraftImages !== "function")
                        return Promise.resolve([]);
                    return conv.serializeDraftImages(ids);
                }
            });
            ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
                name: "conversation.input.left",
                id: "mmr-composer-menu",
                order: 20,
                label: () => t("mmrMenu"),
                locale: NS,
                inject: composerFace
            }, ComposerMenuButton));
            ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
                name: "conversation.input.dock",
                id: "mmr-composer-chip",
                order: 30,
                label: () => t("mmrMenu"),
                locale: NS,
                inject: composerFace
            }, ComposerChipRow));
        }
        bundleModule.exports.NS = NS;
        bundleModule.exports.apply = apply;
        bundleModule.exports.inject = inject;
        return bundleModule.exports;
    }
});