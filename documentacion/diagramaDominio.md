classDiagram
    direction LR
    class UsuariosISBA {
        +ID_Usuario
        +Nombre
    }
    
    class Cliente {
        +ID_Cliente
        +Nombre
        +TipoCliente (Propietario/Inquilino/Tercero)
    }
    class Inmueble {
        +ID_Propiedad
        +Direccion
        +Tipo (Departamento, Casa)
    }
    
    class Incidente {
        +ID_Incidente (Legajo)
        +Descripcion
        +Estado (Abierto, En Evaluación, Resuelto)
        +FechaReporte
        +DatosDeContactoObra(Responable,Inquilino)
        +Calificacion (1-5) [nullable]
        +FechaCierre [nullable]
    }
    
    class Presupuesto {
        +ID_Presupuesto
        +MontoTotal
        +MontoTecnico
        +Detalle (Mano de Obra, Materiales)
        +Estado (Pendiente, Aprobado, Rechazado)
        +Estado_de_pago (Rechazado , aprobado, pendiente )
    }
    class Tecnico {
        +ID_Tecnico
        +Nombre
        +CalificacionPromedio [calculado]
    }
    
    class Especialidad {
        +ID_Especialidad
        +Nombre
        +Descripcion
    }
    
    class Pago {
        +ID_Pago
        +Monto
        +FechaPago
        +Metodo (Transferencia, Efectivo)
        +Comprobante
    }
    
    class Notificacion {
        +ID_Notificacion
        +Mensaje
        +Fecha
    }
    %% Relaciones Principales
    
    Cliente "1" -- "N" Incidente : reporta
    Cliente "N" -- "N" Inmueble : Se relaciona
    
    UsuariosISBA "1" -- "N" Incidente : gestiona
    UsuariosISBA "1" -- "N" Pago : procesa
    
    Inmueble "1" -- "N" Incidente : tiene_lugar_en
    
    Incidente "1" -- "1" Tecnico : es_asignado_a
    Incidente "1" -- "1" Presupuesto : genera
    
    %% Relación Técnico-Especialidad
    Tecnico "N" -- "N" Especialidad : posee
    
    %% Relaciones de Pago
    Presupuesto "1" -- "1" Incidente : pertenece_a
    Presupuesto "1" -- "0..1" Pago : requiere_pago_de
    Tecnico "1" -- "N" Pago : recibe
    
    %% Relaciones de Notificación
    Incidente "N" -- "N" Notificacion : genera / envia
    Tecnico "N" -- "N" Notificacion : recibe
    Cliente "N" -- "N" Notificacion : recibe
    UsuariosISBA "N" -- "N" Notificacion : recibe