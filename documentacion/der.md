---
config:
  theme: mc
  look: classic
---
erDiagram
    Cliente {
        int ID_Cliente PK
        int ID_Cliente_Categoria FK
        varchar Nombre
        varchar DNI
    }
    Cliente_Categoria{
        int ID_Cliente_Categoria PK
        nvarchar Nombre_Categoria_Cliente
    }
    Cliente_Email {
        int ID_Cliente PK, FK
        varchar Email PK
        boolean Es_Principal
    }
    Cliente_Telefono {
        int ID_Cliente PK, FK
        varchar Telefono PK
        boolean Es_Principal
    }
    Inmueble {
        int ID_Inmueble PK
        int ID_Propietario FK "Relacion con Cliente (Propietario)"
        int ID_Inquilino FK "Relacion con Cliente (Inquilino)"
        int Id_Categoria_Inmueble FK
        varchar Direccion
    }
    Categoria_Inmueble{
        int Id_Categoria_Inmueble PK
        nvarchar Nombre_Categoria_Inmueble
    }
    Incidente {
        int ID_Incidente PK
        int ID_Cliente FK "Cliente que reporta y aprueba"
        int ID_Inmueble FK
        int ID_Estado_Incidente FK
        int ID_Tecnico_Asignado "int (ID_Externo)"
        int ID_Usuario_Gestor "int (ID_Externo)"
        text Descripcion
        date FechaReporte
        date FechaUltimaActualizacion
        int Id_Categoria_Incidente FK
    }
    Categoras_Incidente{
        int Id_Categoria_Incidente PK
        nvarchar Nombre_Categoria
    }
    Estado_Incidente{
        int Id_Estado_Incidente PK
        nvarchar Nombre_Estado
    }
    Presupuesto {
        int ID_Presupuesto PK
        int ID_Incidente FK
        decimal MontoTotal
        decimal MontoTecnico
        text Detalle
        int Estado_Aprobacion "Aprobado/Rechazado"
        int Estado_Pago "Pendiente/Pagado"
    }
    Pago {
        int ID_Pago PK
        int ID_Presupuesto FK
        int ID_Tecnico_Receptor "int (ID_Externo)"
        int ID_Usuario_Procesador "int (ID_Externo)"
        decimal Monto
        date FechaPago
        varchar Metodo "Transferencia/Efectivo"
        varchar Comprobante
    }
    Notificacion {
        int ID_Notificacion PK
        int ID_Incidente FK
        int ID_Cliente_Destino FK "Opcional"
        int ID_Tecnico_Destino "int (ID_Externo)"
        int ID_UsuarioISBA_Destino "int (ID_Externo)"
        text Mensaje
        date Fecha
        boolean Leida
    }
    Tecnico_Externo {
        int ID_Tecnico PK
    }
    UsuarioISBA_Externo {
        int ID_Usuario PK
    }
    Cliente ||--o{ Incidente : reporta
    Cliente ||--o{ Inmueble : posee_o_alquila
    Cliente ||--o{ Cliente_Email : tiene
    Cliente ||--o{ Cliente_Telefono : tiene
    Inmueble ||--o{ Incidente : tiene_lugar_en
    Incidente ||--|| Presupuesto : genera
    Presupuesto ||--o{ Pago : requiere_pago_de
    Incidente ||--o{ Notificacion : genera
    Cliente ||--o{ Notificacion : recibe
    Incidente }o--|| Tecnico_Externo : usa_ID_asignado
    Incidente }o--|| UsuarioISBA_Externo : usa_ID_gestor
    Pago }o--|| Tecnico_Externo : usa_ID_receptor
    Pago }o--|| UsuarioISBA_Externo : usa_ID_procesador
    Tecnico_Externo ||--o{ Notificacion : recibe
    UsuarioISBA_Externo ||--o{ Notificacion : recibe
    Incidente }o--|| Categoras_Incidente : Tiene
    Incidente }o--|| Estado_Incidente : Tiene
    Inmueble }o--||  Categoria_Inmueble : Tiene
    Cliente }o--||  Cliente_Categoria : Tiene
