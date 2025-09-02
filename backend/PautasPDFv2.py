import fitz
import re
import json
from datetime import datetime
import os

def extract_text_from_pdf_page(page) -> str:
    """
    Extrae texto de una página PDF usando PyMuPDF de forma optimizada.
    Ordena las palabras por posición y reconstruye líneas manteniendo espaciado.
    """
    words = page.get_text("words")
    if not words:
        return ""
    
    y_tolerance = 5
    words_sorted = sorted(words, key=lambda w: (w[1], w[0]))
    lines = []
    current_line = []
    current_y = None
    
    for word in words_sorted:
        x0, y0, x1, y1, text, block_no, line_no, word_no = word
        y_center = (y0 + y1) / 2
        
        if current_y is None or abs(y_center - current_y) <= y_tolerance:
            current_line.append(word)
            if current_y is None:
                current_y = y_center
            else:
                current_y = sum((w[1] + w[3]) / 2 for w in current_line) / len(current_line)
        else:
            if current_line:
                lines.append(current_line)
            current_line = [word]
            current_y = y_center
    
    if current_line:
        lines.append(current_line)
    
    final_text = ""
    for line_words in lines:
        line_words.sort(key=lambda w: w[0])
        line_text = ""
        prev_x1 = None
        
        for word in line_words:
            x0, y0, x1, y1, text, block_no, line_no, word_no = word
            if prev_x1 is not None and x0 - prev_x1 > 1:
                line_text += " "
            line_text += text
            prev_x1 = x1
        
        if line_text.strip():
            final_text += line_text + "\n"
    
    return final_text.rstrip("\n")

def extract_text_from_pdf(pdf_path) -> list[str]:
    """
    Extrae texto completo del PDF de forma lineal usando PyMuPDF.
    """
    text_pages: list[str] = []
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            try:
                page = doc.load_page(page_num)
                text: str = extract_text_from_pdf_page(page)
                if text:
                    text_pages.append(text)
            except Exception as e:
                print(f"Error en página {page_num}: {e}")
                continue
        doc.close()
    except Exception as e:
        print(f"Error al abrir PDF {pdf_path}: {e}")
        return []
    
    return text_pages

def safe_regex_search(pattern, text, default_value=None):
    """
    Realiza una búsqueda regex de manera segura.
    """
    try:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
        return default_value
    except (AttributeError, IndexError):
        return default_value

def extract_tabla_tareas(text):
    """
    Extrae la tabla de tareas del texto de una página.
    """
    lines = text.split('\n')
    tabla = []
    indice = 0
    regex = r'^([A-ZÁÉÍÓÚÑa-z0-9]+)\s+([\d\S]+)\s+(\d+)\s+(.*)\s+(\d\.\d+|\.\d+)\s+(.+)'
    regex2 = r'^([A-ZÁÉÍÓÚÑa-z0-9]+)\s+([\d\.]+)\s+(\d+)\s+(.+)'
    total_hs_estim = 0.0
    
    for line in lines[17:]:
        match = re.match(regex, line)
        if match:
            hs_estim = match.group(5)
            try:
                hs_estim_float = float(hs_estim)
            except ValueError:
                hs_estim_float = 0.0
            
            fila = {
                "Taller": match.group(1),
                "Numero sec oper": match.group(2),
                "Tarea Standard": match.group(3),
                "Descripcion": match.group(4),
                "Hs Estim": hs_estim_float,
                "Valor esperado": match.group(6)
            }
            tabla.append(fila)
            indice += 1
            
        elif re.match(regex2, line):
            match2 = re.match(regex2, line)
            if match2:
                fila = {
                    "Taller": match2.group(1),
                    "Numero sec oper": match2.group(2),
                    "Tarea Standard": match2.group(3),
                    "Descripcion": match2.group(4),
                    "Hs Estim": 0.0,
                    "Valor esperado": match2.group(4),
                }
                tabla.append(fila)
                indice += 1
        else:
            # Calcular total de horas estimadas
            try:
                total_hs_estim = sum(fila["Hs Estim"] for fila in tabla)
                total_hs_estim = round(total_hs_estim, 3)
            except (ValueError, TypeError):
                total_hs_estim = 0.0
            
            return tabla, indice, total_hs_estim
    
    # Si no se encuentra fin de tabla, calcular total
    try:
        total_hs_estim = sum(fila["Hs Estim"] for fila in tabla)
        total_hs_estim = round(total_hs_estim, 3)
    except (ValueError, TypeError):
        total_hs_estim = 0.0
    
    return tabla, indice, total_hs_estim

def extraer_bloques_seguridad(texto) -> list[str]:
    """
    Extrae bloques de seguridad del texto.
    """
    patron = r'(^SEGURIDAD.*?)(?=^SEGURIDAD|T[\d]+)'
    bloques = re.findall(patron, texto, re.MULTILINE | re.DOTALL)
    return [b.strip() for b in bloques if b.strip()]

def asignar_protocolos_a_secciones(texto) -> list[str]:
    """
    Asigna protocolos de seguridad a secciones.
    """

    initT = re.compile(r'^(.?.?T\d+)', re.MULTILINE | re.IGNORECASE)
    initSeguridad = re.compile(r'^(.?.?SEGURIDAD)|^(.?.?SGURIDAD)', re.MULTILINE | re.IGNORECASE)
    anexos = []
    aux = ""
    aux_sg = ""
    flag = 0
    flag_sg = 0
    for i in texto.split('\n'):
        if initT.match(i):
            if flag == 1:
                if aux_sg != "":
                    aux = aux_sg + "\n" + aux[0:]
                    anexos.append(aux)
                else:
                    anexos.append(aux)
            aux = i
            flag = 1
            flag_sg = 0
        elif initSeguridad.match(i) and flag == 1 and flag_sg == 0:
            aux += "\n" + i
        elif initSeguridad.match(i):
            if flag_sg == 1 and flag == 1:
                aux = aux_sg + "\n" + aux[0:]
                anexos.append(aux)
            else:
                aux_sg = i
                flag = 2
                flag_sg = 1
        else:
            if flag == 1:
                aux += "\n" + i
            elif flag == 2:
                aux_sg += "\n" + i
    if flag == 1:
        if aux_sg != "":
            aux = aux_sg + "\n" + aux[0:]
            anexos.append(aux)
        else:
            anexos.append(aux)
    elif flag == 2:
        if aux_sg != "":
            anexos.append(aux_sg)
    return anexos

def extract_protocolos(index, text) -> str:
    """
    Extrae protocolos de seguridad del texto.
    """
    protocolos = ""
    fin_pauta_markers = ["OT Generadas", "Realizado por:", "Firma:"]
    lines = text.split('\n')
    
    if index is None:
        protocolos = '\n'.join(lines[3:]).strip()
    else:
        protocolos = '\n'.join(lines[index + 17:]).strip()
    
    # Buscar el marcador de fin
    for marker in fin_pauta_markers:
        idx = protocolos.find(marker)
        if idx != -1:
            protocolos = protocolos[:idx].strip()
            break
    
    return protocolos

def parse_date(date_string):
    """
    Convierte string de fecha a datetime, probando diferentes formatos.
    """
    if not date_string:
        return None
    
    formats = ['%d/%m/%Y', '%d/%m/%y']
    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue
    return date_string  # Retorna string original si no se puede convertir

def extract_campos_variables(texto):
    """
    Extrae todos los campos variables del texto del PDF.
    """
    campos = {}
    campos_opcionales = ["Fecha Fin", "Frec. Horas", "F. Real de Ejecucion", "Frec. Comb.", "Incidencia"]
    
    # Patrones regex mejorados
    patrones = {
        "Numero orden": r'Número orden (\d+)',
        "Tipo de Orden": r'[A-Z0-9]\nClase',
        "Clase": r'Clase (.+?) Asignado a',
        "Asignado a": r'Asignado a (.+?)\n',
        "Descripcion": r'Descripción (.+?) Tipo',
        "Tipo": r'Tipo (.+?) Estado',
        "Estado": r'Estado (.+?) Frec',
        "Frec. Dias": r'Frec\. D[ií]as ([0-9]+)',
        "N Unidad": r'Nº Unidad (.+?) Parte',
        "Parte": r'Parte (.+?) F inicial',
        "F inicial": r'F inicial ([0-9/]+)',
        "Frec. Comb.": r'Frec\. Comb\. (.+?)',
        "Especialidad": r'Especialidad (.+?) Elemento',
        "Elemento": r'Elemento (.+?) FF\.\.RReeaall',
        "F. Real de Ejecucion": r'FF\.\.RReeaall EEjjeeccuucciioonn (.+?) Frec\. Km',
        "Frec. Km": r'Frec\. Km ([^ ]*)',
        "Modo": r'Modo ([^ ]*?)(?:\s+(?:Fecha Fin|Frec\. Horas))',
        "Fecha Fin": r'Fecha Fin ([0-9/]+)',
        "Frec. Horas": r'Frec\. Horas ([^ ]*)',
        "Originador": r'Originador ([A-Z]+ [A-ZÁÉÍÓÚÑa-z\s]+)\nIncidencia',
        "Incidencia": r'Incidencia (.+?) Fecha Venc\.',
        "Fecha Venc.": r'Fecha Venc\. ([0-9/]+)',
        "Ultima Realiz.": r'Ultima Realiz\. ([0-9/]+)',
        "Linea": r'Linea (.+?) Kit de Tareas',
        "Kit de Tareas": r'Kit de Tareas ([0-9]+)',
        "Proximo Venc.": r'Proximo Venc\. ([0-9/]+)',
        "Fecha Prox Emision": r'Fecha Prox Emisión ([0-9/]+)',
        "N de Serie": r'Nº de Serie (.+?) Planta',
        "Planta": r'Planta (.+?) Tipo servici',
        "Tipo servici": r'Tipo servici ([A-Z0-9]+ [A-ZÁÉÍÓÚÑa-z\.]+)',
        "Prioridad": r'Prioridad: ([A-Z\-a-z]+)',
        "Seg. y Medio Ambiente": r'Seg\. y Medio Ambiente ([A-Z0-9]+)',
        "Calidad": r'Calidad ([A-Z0-9]+)',
        "Operacion": r'Operación ([A-Z0-9]+)',
        "Mantenimiento": r'Mantenimiento ([A-Z0-9]+)',
        "Categorizacion": r'Categorización ([A-Z0-9]+)',
        "Tipo de Servicio": r'Tipo de Servicio (.+?)\n',
    }
    
    # Encontrar todas las órdenes
    ordenes = []
    for page_text in texto:
        match_orden = re.search(r'Número orden (\d+)', page_text)
        if match_orden:
            ordenes.append(match_orden.group(1))
    
    # Eliminar duplicados
    ordenes = list(set(ordenes))
    
    # Inicializar estructura de datos
    for orden in ordenes:
        campos[orden] = {
            "Tareas": [],
            "Numero de Tareas": 0,
            "Hs Estim": 0.0,
            "Protocolos": ""
        }
        # Inicializar campos opcionales
        for campo in campos_opcionales:
            campos[orden][campo] = None
    
    # Procesar cada página
    for page_text in texto:
        orden_match = re.search(r'Número orden (\d+)', page_text)
        if not orden_match:
            continue
        
        orden = orden_match.group(1)
        
        # Extraer campos usando patrones regex
        for campo, patron in patrones.items():
            if re.search(r'Número orden ' + re.escape(orden), page_text):
                match = re.search(patron, page_text)
                if match:
                    valor = match.group(1).strip()
                    campos[orden][campo] = valor
                    
                    # Convertir fechas
                    if campo in ["F inicial", "Fecha Fin", "Fecha Venc.", "Ultima Realiz.", "Proximo Venc.", "Fecha Prox Emision"]:
                        campos[orden][campo] = parse_date(valor)
        
        # Extraer tabla de tareas
        try:
            indice = None
            if not campos[orden]["Tareas"]:  # Solo si no se han extraído tareas aún
                tabla, indice, hs_total = extract_tabla_tareas(page_text)
                if tabla:
                    campos[orden]["Tareas"] = tabla
                    campos[orden]["Numero de Tareas"] = indice
                    campos[orden]["Hs Estim"] = hs_total
                    campos[orden]["ObservacionTareas"] = [""] * indice  # Inicializar observaciones de tareas
            
            
            # Extraer protocolos
            protocolos = extract_protocolos(indice, page_text)
            if protocolos:
                campos[orden]["Protocolos"] += "\n" + protocolos
                
        except Exception as e:
            print(f"Error al extraer datos para la orden {orden}: {e}")
    
    # Procesar protocolos finales
    for orden in campos:
        if campos[orden]["Protocolos"]:
            campos[orden]["Protocolos"] = asignar_protocolos_a_secciones(campos[orden]["Protocolos"])
            campos[orden]["Observacion"] = ""
            # agregar especialidad id, si MEP o ELEC esta en el texto de Especialidad, entonces 1 para Electrico, 2 para Mecanico, sino 0
            especialidad_text = campos[orden].get("Especialidad", "").upper()
            if "ELP ELECTRICO DE PLANTA" in especialidad_text:
                campos[orden]["Especialidad_id"] = 1
            elif "MEP MECANICO DE PLANTA" in especialidad_text:
                campos[orden]["Especialidad_id"] = 2
            else:
                campos[orden]["Especialidad_id"] = 0
            
    
    return campos

def save_to_json_file(data, filepath="pautas_data.json"):
    """
    Guarda los datos en un archivo JSON local.
    """
    try:
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else "data", exist_ok=True)
        
        # Convertir datetime a string para JSON
        def serialize_datetime(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=serialize_datetime)
        
        return True
    except Exception as e:
        print(f"Error al guardar en JSON: {e}")
        return False

def process_pdf_to_json(pdf_path, json_path="data/pautas_data.json"):
    """
    Procesa un PDF completo y guarda en archivo JSON.
    """
    
    # Extraer texto
    text_pages = extract_text_from_pdf(pdf_path)
    if not text_pages:
        print("No se pudo extraer texto del PDF")
        return {}
    
    # Extraer campos
    pautas_data = extract_campos_variables(text_pages)
    
    return pautas_data
