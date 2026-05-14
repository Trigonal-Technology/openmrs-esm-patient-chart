import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { WindowRef } from '../window-ref';
import { Observable } from 'rxjs';
import { FormMetadataObject } from '../types';
import { formMetadataRestVParam } from './form-rest.constants';

@Injectable()
export class FormResourceService {
  constructor(
    private http: HttpClient,
    private windowRef: WindowRef,
  ) {}
  public getFormSchemaByFormUid(uuid: string, v: string = null): Observable<any> {
    const url = `${this.windowRef.openmrsRestBase}o3/forms/${uuid}`;
    const params: HttpParams = v && v.length > 0 ? new HttpParams().set('v', v) : new HttpParams();
    return this.http.get(url, { params });
  }

  public getFormMetaDataByUuid(uuid: string, v: string = null) {
    const url = `${this.windowRef.openmrsRestBase}form/${uuid}`;
    const vParam = v && v.length > 0 ? v : formMetadataRestVParam;
    const params: HttpParams = new HttpParams().set('v', vParam);
    return this.http.get<FormMetadataObject>(url, { params });
  }
}
