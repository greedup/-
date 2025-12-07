import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { 
  BarChart2, PieChart as PieIcon, AlignLeft,
  Plus, Trash2, Table, Layout, Clipboard, Type,
  Edit2, AlertCircle, X, Check, ArrowUp, ArrowDown, Download, Image as ImageIcon
} from 'lucide-react';

// 扩展配色方案，确保颜色足够多且不重复
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', 
  '#6366f1', '#84cc16', '#eab308', '#f97316', '#d946ef', '#14b8a6', '#0ea5e9',
  '#64748b', '#a855f7', '#fb7185', '#22c55e', '#3b82f6', '#f43f5e'
];

// 初始示例数据 - 空白状态
const INITIAL_DATA = [
  { 名称: '', 数值: '' },
  { 名称: '', 数值: '' },
  { 名称: '', 数值: '' },
];

export default function App() {
  const [data, setData] = useState(INITIAL_DATA);
  const [chartType, setChartType] = useState('bar'); // bar, bar-horizontal, pie
  const [activeSeries, setActiveSeries] = useState(['数值']); 
  const [xAxisKey, setXAxisKey] = useState('名称'); 
  const [showDataLabels, setShowDataLabels] = useState(true);
  const [chartTitle, setChartTitle] = useState('图表标题');
  
  // 引用图表容器，用于导出图片
  const chartRef = useRef(null);
  
  // 模态框状态
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [message, setMessage] = useState(null); 
  
  // 用于列名重命名
  const [editingColumn, setEditingColumn] = useState(null);
  const [tempColumnName, setTempColumnName] = useState('');

  // 自动清除消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 获取数据的所有键（列名）
  const keys = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // 自动推断逻辑
  useEffect(() => {
    if (keys.length > 0) {
      const firstRow = data[0];
      let foundX = false;
      let numericKeys = [];

      keys.forEach(key => {
        const val = firstRow[key];
        // 简单的逻辑：如果当前被选为X轴，或者不是数字，优先作为X轴
        if (!foundX && (key === xAxisKey || (val !== '' && isNaN(Number(val))))) {
          setXAxisKey(key);
          foundX = true;
        } else if (val === '' || !isNaN(Number(val))) {
          // 空值或者是数字，都可能是数据列
          numericKeys.push(key);
        }
      });

      if (!foundX && keys.length > 0) {
        setXAxisKey(keys[0]);
        // 排除掉新的X轴
        numericKeys = keys.filter(k => k !== keys[0]);
      }

      // 只有当当前选中的系列无效时才重置
      const validActiveSeries = activeSeries.filter(k => numericKeys.includes(k));
      if (validActiveSeries.length === 0 && numericKeys.length > 0) {
         setActiveSeries([numericKeys[0]]);
      } 
      // 如果当前没有选中的系列，且有可用的数字列，默认选中第一个
      else if (activeSeries.length === 0 && numericKeys.length > 0) {
         setActiveSeries([numericKeys[0]]);
      }
    }
  }, [keys.length, keys, xAxisKey]); 

  // 处理单元格编辑
  const handleCellChange = (rowIndex, key, value) => {
    const newData = [...data];
    const numValue = Number(value);
    newData[rowIndex][key] = (value !== '' && !isNaN(numValue)) ? numValue : value;
    setData(newData);
  };

  // 处理标题修改
  const handleTitleChange = (e) => {
    setChartTitle(e.target.value);
  }

  // 添加新行
  const addRow = () => {
    const newRow = {};
    keys.forEach(key => newRow[key] = '');
    setData([...data, newRow]);
  };

  // 删除行
  const deleteRow = (index) => {
    if (data.length === 1) {
        const emptyRow = {};
        keys.forEach(key => emptyRow[key] = '');
        setData([emptyRow]);
        return;
    }
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
  };

  // 删除列
  const deleteColumn = (keyToDelete) => {
    if (keys.length <= 1) {
        setMessage({ type: 'error', text: "至少保留一列数据" });
        return;
    }
    const newData = data.map(row => {
        const newRow = { ...row };
        delete newRow[keyToDelete];
        return newRow;
    });
    setData(newData);
    
    if (keyToDelete === xAxisKey) {
        setXAxisKey(''); 
    }
  };

  // 添加新列
  const addColumn = () => {
    const newKey = `列${keys.length + 1}`;
    let uniqueKey = newKey;
    let counter = 1;
    while(keys.includes(uniqueKey)) {
        uniqueKey = `列${keys.length + 1}_${counter}`;
        counter++;
    }

    const newData = data.map(row => ({ ...row, [uniqueKey]: '' }));
    setData(newData);
  };

  // 开始重命名列
  const startRenaming = (key) => {
    setEditingColumn(key);
    setTempColumnName(key);
  };

  // 确认重命名列
  const confirmRename = () => {
    if (!tempColumnName.trim()) return setEditingColumn(null);
    if (tempColumnName === editingColumn) return setEditingColumn(null);
    if (keys.includes(tempColumnName)) {
        setMessage({ type: 'error', text: "列名已存在，请换一个名称" });
        return;
    }

    // 获取当前所有键的顺序
    const currentKeys = Object.keys(data[0]);
    // 找到正在编辑的列的索引
    const keyIndex = currentKeys.indexOf(editingColumn);
    // 创建一个新的键数组，保持原有顺序
    const newKeys = [...currentKeys];
    newKeys[keyIndex] = tempColumnName;

    // 根据新的键顺序重建每一行数据
    const newData = data.map(row => {
        const newRow = {};
        newKeys.forEach(k => {
            if (k === tempColumnName) {
                newRow[k] = row[editingColumn];
            } else {
                newRow[k] = row[k];
            }
        });
        return newRow;
    });

    setData(newData);
    
    // 更新相关的状态
    if (xAxisKey === editingColumn) setXAxisKey(tempColumnName);
    if (activeSeries.includes(editingColumn)) {
        setActiveSeries(activeSeries.map(s => s === editingColumn ? tempColumnName : s));
    }

    setEditingColumn(null);
  };

  // 排序功能
  const sortData = (key, direction) => {
    const sortedData = [...data].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      
      const numA = Number(valA);
      const numB = Number(valB);
      
      const isANum = valA !== '' && !isNaN(numA);
      const isBNum = valB !== '' && !isNaN(numB);

      // 如果都是数字，按数字排序
      if (isANum && isBNum) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }
      
      // 否则按字符串排序
      const strA = String(valA || '');
      const strB = String(valB || '');
      return direction === 'asc' 
        ? strA.localeCompare(strB, 'zh') 
        : strB.localeCompare(strA, 'zh');
    });
    
    setData(sortedData);
    setMessage({ type: 'success', text: `已按 "${key}" ${direction === 'asc' ? '升序' : '降序'}排列` });
  };

  // 触发清空确认
  const requestClearData = () => {
    setIsClearModalOpen(true);
  };

  // 执行清空数据
  const executeClearData = () => {
    setData([
        { 名称: '', 数值: '' },
        { 名称: '', 数值: '' },
        { 名称: '', 数值: '' }
    ]);
    setChartTitle('图表标题');
    setXAxisKey('名称');
    setActiveSeries(['数值']);
    setIsClearModalOpen(false);
    setMessage({ type: 'success', text: "数据已重置为空白状态" });
  };

  // 处理粘贴数据
  const handlePasteData = () => {
    if (!pasteContent.trim()) return;

    try {
        const rows = pasteContent.trim().split('\n').map(row => row.split('\t'));
        if (rows.length < 2) {
            setMessage({ type: 'error', text: "数据格式似乎不对，请至少包含表头和一行数据。" });
            return;
        }

        const headers = rows[0].map(h => h.trim());
        const newChartData = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                const val = row[index] ? row[index].trim() : '';
                const numVal = Number(val);
                obj[header] = (val !== '' && !isNaN(numVal)) ? numVal : val;
            });
            return obj;
        });

        setData(newChartData);
        setIsPasteModalOpen(false);
        setPasteContent('');
        setMessage({ type: 'success', text: "数据导入成功！" });
    } catch (e) {
        setMessage({ type: 'error', text: "解析数据失败，请确保从Excel直接复制。" });
    }
  };

  // 导出图片功能
  const downloadChart = () => {
    if (!chartRef.current) return;

    // 找到 Recharts 生成的 SVG 元素
    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) {
        setMessage({ type: 'error', text: "未找到图表元素，无法导出" });
        return;
    }

    try {
        // 1. 序列化 SVG
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        // 2. 创建 Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgSize = svgElement.getBoundingClientRect();
        
        // 提高分辨率以获得更清晰的图片
        const scale = 2;
        canvas.width = svgSize.width * scale;
        canvas.height = svgSize.height * scale;
        ctx.scale(scale, scale);

        // 3. 创建图像对象
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            // 绘制白色背景（避免透明背景）
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 绘制图表
            ctx.drawImage(img, 0, 0, svgSize.width, svgSize.height);
            
            // 绘制标题 (如果图表内没有包含标题)
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = '#374151';
            ctx.textAlign = 'center';
            ctx.fillText(chartTitle, canvas.width / (2 * scale), 40);

            // 导出并下载
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `${chartTitle || 'chart'}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            URL.revokeObjectURL(url);
            setMessage({ type: 'success', text: "图片导出成功！" });
        };

        img.src = url;

    } catch (e) {
        console.error(e);
        setMessage({ type: 'error', text: "导出图片失败，请重试" });
    }
  };

  // 渲染图表组件
  const renderChart = () => {
    const CommonProps = {
      data: data,
      margin: { top: 30, right: 30, left: 20, bottom: 60 },
    };

    const hasData = data.some(row => activeSeries.some(key => row[key] !== '' && row[key] !== null && row[key] !== undefined));

    if (activeSeries.length === 0 || !hasData) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <BarChart2 size={48} className="mb-4 opacity-20" />
          <p>暂无数据或未选择数据列</p>
          <p className="text-sm mt-2">请在左侧表格输入数据，或右上角选择列</p>
        </div>
      );
    }

    switch (chartType) {
      case 'pie':
        const pieDataKey = activeSeries[0];
        const validPieData = data.filter(item => {
            const val = item[pieDataKey];
            return val !== '' && !isNaN(val) && Number(val) > 0;
        });

        if (validPieData.length === 0) return (
            <div className="h-full flex items-center justify-center text-gray-400">
                <p>饼图需要有效的数据</p>
            </div>
        );

        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={validPieData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius="75%"
                fill="#8884d8"
                paddingAngle={0}
                dataKey={pieDataKey}
                nameKey={xAxisKey}
                label={showDataLabels ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
              >
                {validPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'bar-horizontal':
        return (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart {...CommonProps} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                {/* 横向图表：X轴是数值，Y轴是分类 */}
                <XAxis type="number" tick={{fill: '#6b7280'}} axisLine={{stroke: '#e5e7eb'}} />
                <YAxis 
                    dataKey={xAxisKey} 
                    type="category" 
                    tick={{fill: '#4b5563', fontSize: 12}} 
                    axisLine={{stroke: '#9ca3af'}} 
                    width={120}
                    interval={0} // 关键修复：强制显示所有标签
                />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend verticalAlign="top" height={36}/>
                {activeSeries.map((key, index) => (
                  <Bar 
                    key={key} 
                    dataKey={key} 
                    fill={COLORS[index % COLORS.length]} 
                    radius={[0, 4, 4, 0]} 
                    barSize={30} 
                  >
                      {showDataLabels && (
                          <LabelList 
                              dataKey={key} 
                              position="right" 
                              fill="#374151" 
                              fontSize={12} 
                          />
                      )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          );

      case 'bar':
      default:
        const XAxisProps = {
            dataKey: xAxisKey,
            tick: { fill: '#4b5563', fontSize: 12 },
            axisLine: { stroke: '#9ca3af' },
            interval: 0,
            angle: -45,
            textAnchor: 'end',
            height: 60
        };
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...CommonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis {...XAxisProps} />
              <YAxis tick={{fill: '#6b7280'}} axisLine={{stroke: '#e5e7eb'}} />
              <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
              <Legend verticalAlign="top" height={36}/>
              {activeSeries.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={COLORS[index % COLORS.length]} 
                  radius={[4, 4, 0, 0]}
                  barSize={40} 
                >
                    {showDataLabels && (
                        <LabelList 
                            dataKey={key} 
                            position="top" 
                            fill="#374151" 
                            fontSize={14} 
                            fontWeight="500"
                        />
                    )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden relative">
      
      {/* 全局消息提示 */}
      {message && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-4 ${
            message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
        }`}>
            {message.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            {message.text}
        </div>
      )}

      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <BarChart2 size={20} />
          </div>
          <h1 className="text-lg font-bold hidden md:block">
            智能图表工具
          </h1>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={downloadChart}
              className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md shadow-sm transition-colors"
              title="保存图表为图片"
            >
              <ImageIcon size={16} className="text-blue-600" /> 导出图片
            </button>
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
             <button 
              onClick={() => setIsPasteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors"
            >
              <Clipboard size={16} /> 粘贴Excel数据
            </button>
            <button 
              onClick={requestClearData}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200"
              title="清空表格所有数据"
            >
              <Trash2 size={16} /> 重置
            </button>
        </div>
      </header>

      {/* 主体内容区 */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* 左侧：数据编辑区 */}
        <section className="flex-1 lg:w-4/12 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
            <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
              <Table size={16} />
              <span>数据表格</span>
            </div>
            <div className="flex gap-2">
               <button 
                onClick={addRow}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title="添加行"
              >
                <Plus size={18} />
              </button>
              <button 
                onClick={addColumn}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title="添加列"
              >
                <Layout size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-2">
            <div className="inline-block min-w-full align-middle">
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {keys.map((key) => (
                        <th key={key} scope="col" className="px-2 py-2 text-left font-medium text-gray-500 whitespace-nowrap border-r border-gray-200 group relative min-w-[80px]">
                          {editingColumn === key ? (
                             <input 
                                autoFocus
                                value={tempColumnName}
                                onChange={(e) => setTempColumnName(e.target.value)}
                                onBlur={confirmRename}
                                onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                                className="w-full px-1 py-0.5 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                             />
                          ) : (
                            <div 
                                className="flex items-center justify-between gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 py-0.5"
                                onDoubleClick={() => startRenaming(key)}
                                title="双击修改列名"
                            >
                                <div className="flex items-center gap-1">
                                    <span className={key === xAxisKey ? "text-blue-600 font-bold" : ""}>{key}</span>
                                    {key === xAxisKey && <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded">X</span>}
                                </div>
                                
                                {/* 悬浮操作菜单 */}
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded px-1 gap-1 shadow-sm border border-gray-100 absolute right-0 top-1/2 -translate-y-1/2 mr-1 z-10">
                                    <Edit2 size={12} className="text-gray-400" />
                                    
                                    {/* 排序按钮 */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); sortData(key, 'asc'); }}
                                        className="text-gray-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50"
                                        title="升序排列"
                                    >
                                        <ArrowUp size={12} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); sortData(key, 'desc'); }}
                                        className="text-gray-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50"
                                        title="降序排列"
                                    >
                                        <ArrowDown size={12} />
                                    </button>

                                    <div className="w-px h-3 bg-gray-200 mx-0.5"></div>

                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteColumn(key); }}
                                        className="text-gray-300 hover:text-red-500 p-0.5 rounded hover:bg-red-50"
                                        title="删除此列"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                          )}
                        </th>
                      ))}
                      <th scope="col" className="px-1 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, rIndex) => (
                      <tr key={rIndex} className="hover:bg-gray-50">
                        {keys.map((key) => (
                          <td key={key} className="px-0 py-0 border-r border-gray-100 last:border-0 relative">
                            <input
                              type="text"
                              value={row[key]}
                              onChange={(e) => handleCellChange(rIndex, key, e.target.value)}
                              className="w-full h-full px-2 py-2 border-none bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-500 transition-all"
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1 text-center">
                          <button 
                            onClick={() => deleteRow(rIndex)}
                            className="text-gray-300 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* 右侧：图表预览区 */}
        <section className="flex-[1.5] bg-gray-50 flex flex-col h-full overflow-hidden">
          
          {/* 图表配置栏 */}
          <div className="px-4 py-3 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
             <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { id: 'bar', icon: BarChart2, label: '柱状图' },
                  { id: 'bar-horizontal', icon: AlignLeft, label: '条形图' },
                  { id: 'pie', icon: PieIcon, label: '饼图' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      chartType === type.id 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <type.icon size={16} />
                    <span className="hidden sm:inline">{type.label}</span>
                  </button>
                ))}
             </div>

             <div className="flex items-center gap-4">
                 <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={showDataLabels} 
                        onChange={(e) => setShowDataLabels(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>显示数值</span>
                 </label>
                 
                 <div className="h-4 w-px bg-gray-300"></div>

                 <div className="flex items-center gap-2">
                    {keys.filter(k => k !== xAxisKey).map((key) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
                        <input 
                        type="checkbox" 
                        checked={activeSeries.includes(key)}
                        onChange={() => {
                             if (activeSeries.includes(key)) {
                                setActiveSeries(activeSeries.filter(k => k !== key));
                             } else {
                                setActiveSeries([...activeSeries, key]);
                             }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{key}</span>
                    </label>
                    ))}
                 </div>
             </div>
          </div>

          {/* 标题编辑区 */}
          <div className="px-6 pt-4 shrink-0">
             <div className="flex items-center justify-center group relative">
                 <input 
                    type="text" 
                    value={chartTitle}
                    onChange={handleTitleChange}
                    className="text-xl font-bold text-center bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full max-w-2xl py-1"
                    placeholder="在此输入图表标题"
                 />
                 <Type size={14} className="absolute right-0 top-3 text-gray-300 opacity-0 group-hover:opacity-100" />
             </div>
          </div>

          {/* 图表画布 */}
          <div className="flex-1 p-4 pb-0 overflow-hidden flex flex-col" ref={chartRef}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex-1 w-full relative">
              {renderChart()}
            </div>
             <p className="text-center text-xs text-gray-400 py-2">
                * 提示：双击表头可修改列名；鼠标悬停表头可进行排序和删除操作
             </p>
          </div>
        </section>
      </main>

      {/* 粘贴数据模态框 */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">粘贴 Excel 数据</h3>
                    <button onClick={() => setIsPasteModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                    <p className="text-sm text-gray-500">
                        请在 Excel 中选中你的数据（包括表头），复制，然后粘贴到下方文本框中：
                    </p>
                    <textarea 
                        className="w-full h-48 p-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder={`例如：\n名称\t数量\n车间A\t100\n车间B\t200`}
                        value={pasteContent}
                        onChange={(e) => setPasteContent(e.target.value)}
                    ></textarea>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button 
                        onClick={() => setIsPasteModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handlePasteData}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                        确认导入
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 清空确认模态框 */}
      {isClearModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col">
                <div className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">确认清空所有数据？</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            这将清除表格中的所有内容并重置为初始状态。此操作无法撤销。
                        </p>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex gap-3">
                    <button 
                        onClick={() => setIsClearModalOpen(false)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={executeClearData}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                        确认清空
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}