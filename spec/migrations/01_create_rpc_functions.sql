
create or replace function get_deliveries_view()
returns table (
    id text,
    allocation_id text,
    bl_number text,
    truck_id text,
    driver_id text,
    tonnage_loaded float,
    tonnage_delivered float,
    delivery_date date,
    created_at timestamptz,
    operator_name text,
    region_name text,
    department_name text,
    commune_name text,
    project_phase text,
    truck_plate text,
    driver_name text,
    project_id text,
    truck_owner_type boolean,
    operator_id text
) as $$
begin
    return query
    select
        d.id,
        d.allocation_id,
        d.bl_number,
        d.truck_id,
        d.driver_id,
        d.tonnage_loaded,
        d.tonnage_delivered,
        d.delivery_date,
        d.created_at,
        op.name as operator_name,
        r.name as region_name,
        dep.name as department_name,
        c.name as commune_name,
        case
            when p.numero_marche is not null then 'Phase ' || p.numero_phase || ' - ' || p.numero_marche
            else 'Phase ' || p.numero_phase
        end as project_phase,
        t.plate_number as truck_plate,
        dr.name as driver_name,
        a.project_id,
        t.owner_type as truck_owner_type,
        a.operator_id
    from
        deliveries d
    left join
        trucks t on d.truck_id = t.id
    left join
        drivers dr on d.driver_id = dr.id
    left join
        allocations a on d.allocation_id = a.id
    left join
        operators op on a.operator_id = op.id
    left join
        regions r on a.region_id = r.id
    left join
        departments dep on a.department_id = dep.id
    left join
        communes c on a.commune_id = c.id
    left join
        project p on a.project_id = p.id;
end;
$$ language plpgsql;
