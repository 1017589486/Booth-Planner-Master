import { GoogleGenAI } from "@google/genai";
import { PlannerItem, AnalysisResult, ItemType, BoothType } from "../types";
import { calculateBoothNetArea } from "../utils/geometry";

export const analyzeLayout = async (items: PlannerItem[], scaleRatio: number): Promise<AnalysisResult> => {
  // If no API key, return a mock response or throw error. 
  // The strict prompt says assume process.env.API_KEY is valid.
  
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const booths = items.filter(i => i.type === ItemType.BOOTH);
  const pillars = items.filter(i => i.type === ItemType.PILLAR);

  let totalGrossArea = 0; // In real world units (m2)
  let totalUsableArea = 0; // In real world units (m2)

  // Helper to convert px2 area to m2
  const toM2 = (pxArea: number) => (pxArea * scaleRatio * scaleRatio) / 10000;

  const boothData = booths.map(b => {
    const grossPx = b.w * b.h;
    const netPx = calculateBoothNetArea(b, items);
    
    const grossM2 = toM2(grossPx);
    const netM2 = toM2(netPx);

    totalGrossArea += grossM2;
    totalUsableArea += netM2;
    
    return {
      id: b.id,
      type: b.boothType,
      dimensionsPx: `${Math.round(b.w)}x${Math.round(b.h)}`,
      grossAreaM2: grossM2.toFixed(2),
      usableAreaM2: netM2.toFixed(2),
      hasPillarIntrusion: grossPx !== netPx,
      notes: b.notes
    };
  });

  const prompt = `
    你是一位专业的展览平面规划专家。
    请分析以下展会平面图数据。
    
    当前比例配置: 1px = ${scaleRatio}cm
    展位数据 (面积单位 m²): ${JSON.stringify(boothData)}
    柱子总数: ${pillars.length}
    
    1. 计算效率（可用面积 / 总面积）。
    2. 针对“柱子入侵”导致展位空间减少的情况提供具体建议。
    3. 针对特定展位类型（例如岛型与单开）建议最适合展示的商品类型。
    
    请以 JSON 格式返回响应，架构如下：
    {
      "analysis": "简短的段落总结布局质量。",
      "suggestions": ["建议点 1", "建议点 2", "建议点 3"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const json = JSON.parse(text);

    return {
      totalArea: totalGrossArea,
      usableArea: totalUsableArea,
      pillarIntrusion: totalGrossArea - totalUsableArea,
      suggestion: `${json.analysis}\n\n建议:\n${json.suggestions.join('\n- ')}`
    };

  } catch (error) {
    console.error("AI Analysis Failed", error);
    return {
      totalArea: totalGrossArea,
      usableArea: totalUsableArea,
      pillarIntrusion: totalGrossArea - totalUsableArea,
      suggestion: "AI 分析不可用。请检查您的网络连接或 API 密钥。"
    };
  }
};